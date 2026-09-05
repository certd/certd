// 导入所需的 SDK 模块
import { AwsCNAccess } from "../access.js";
import { CertInfo } from "@certd/plugin-cert";
import { ILogger } from "@certd/basic";

type AwsIAMClientOptions = { access: AwsCNAccess; region: string; logger?: ILogger };

// IAM ListServerCertificates 返回的证书元信息（仅保留本插件用到的字段）
export type ServerCertificateMetadata = {
  ServerCertificateName?: string;
  ServerCertificateId?: string;
  Expiration?: Date | string;
};

/**
 * 拆分完整 PEM，得到叶子证书和证书链。
 * 使用 lookbehind 分割，保留每段结尾的 -----END CERTIFICATE-----，
 * 避免证书链丢失结尾标记而变成非法 PEM（AWS 会报 MalformedCertificate）。
 */
export function splitCertAndChain(crt: string): { cert: string; chain: string } {
  const pemBlocks = crt.split(/(?<=-----END CERTIFICATE-----)/);
  const cert = pemBlocks[0].trim();
  const chain = pemBlocks.slice(1).join("").trim();
  return { cert, chain };
}

/**
 * 从 IAM 证书元信息列表中，挑出"本次被替换掉"的旧证书名称。
 * distribution 已改用新证书，旧证书不再被其引用，因此无论是否过期都应清理，
 * 否则提前续期/手动重部署产生的旧证书会在 IAM 中不断堆积。
 * 过滤规则：
 * - ServerCertificateId 必须命中 targetCertIds（即本次部署前 CloudFront 引用的旧证书）
 * - 不能等于 excludeCertId（本次新上传的证书，避免误删）
 * 返回去重后的 ServerCertificateName 列表。
 */
export function pickReplacedCertNames(params: { metadataList: ServerCertificateMetadata[]; targetCertIds: Set<string> | string[]; excludeCertId?: string }): string[] {
  const { metadataList, targetCertIds, excludeCertId } = params;
  const targetIdSet = targetCertIds instanceof Set ? targetCertIds : new Set(targetCertIds);

  const names = new Set<string>();
  for (const metadata of metadataList) {
    const certId = metadata.ServerCertificateId;
    const certName = metadata.ServerCertificateName;
    if (!certId || !certName) {
      continue;
    }
    if (!targetIdSet.has(certId)) {
      continue;
    }
    if (excludeCertId && certId === excludeCertId) {
      continue;
    }
    names.add(certName);
  }
  return [...names];
}

// CloudFront ViewerCertificate 字段（仅保留本插件用到的字段）
export type ViewerCertificate = {
  CloudFrontDefaultCertificate?: boolean;
  ACMCertificateArn?: string;
  IAMCertificateId?: string;
  Certificate?: string;
  CertificateSource?: string;
  SSLSupportMethod?: string;
  MinimumProtocolVersion?: string;
};

/**
 * 基于旧 ViewerCertificate 构造使用 IAM 证书的新配置。
 * - CloudFront 要求 ACMCertificateArn、IAMCertificateId、CloudFrontDefaultCertificate 三者只能存在其一，
 *   因此这里只保留 IAM 证书，并显式将 CloudFrontDefaultCertificate 置为 false、不携带 ACMCertificateArn。
 * - Certificate/CertificateSource 为 AWS 已废弃字段，更新时不再携带，避免旧的 ACM 值残留导致校验冲突。
 * - SSLSupportMethod 强制为 sni-only：AWS 中国区 CloudFront 只支持 SNI，不支持 vip（专用IP），
 *   若沿用旧的 vip 值会报 "The parameter ViewerCertificate with the specified SSL support method isn't available in this region"。
 * - MinimumProtocolVersion 沿用旧值，缺失时给出安全默认值。
 */
export function buildIamViewerCertificate(params: { oldViewerCertificate?: ViewerCertificate; certId: string }): ViewerCertificate {
  const { oldViewerCertificate, certId } = params;
  const old = oldViewerCertificate || {};
  return {
    CloudFrontDefaultCertificate: false,
    IAMCertificateId: certId,
    SSLSupportMethod: "sni-only",
    MinimumProtocolVersion: old.MinimumProtocolVersion || "TLSv1.2_2021",
  };
}

export class AwsIAMClient {
  options: AwsIAMClientOptions;
  access: AwsCNAccess;
  region: string;
  logger?: ILogger;
  constructor(options: AwsIAMClientOptions) {
    this.options = options;
    this.access = options.access;
    this.region = options.region;
    this.logger = options.logger;
  }

  // 统一创建 IAM 客户端，供上传/查询/删除复用
  private async createIamClient() {
    const iamModule = await this.access.importRuntime("@aws-sdk/client-iam");
    const { IAMClient } = iamModule;
    const iamClient = new IAMClient({
      region: this.region, // 替换为您的 AWS 区域
      credentials: {
        accessKeyId: this.access.accessKeyId, // 从环境变量中读取
        secretAccessKey: this.access.secretAccessKey,
      },
    });
    return { iamClient, iamModule };
  }

  async importCertificate(certInfo: CertInfo, certName: string) {
    const { iamClient, iamModule } = await this.createIamClient();
    const { UploadServerCertificateCommand } = iamModule;

    const { cert, chain } = splitCertAndChain(certInfo.crt);
    // 构建上传参数
    const command = new UploadServerCertificateCommand({
      Path: "/cloudfront/",
      ServerCertificateName: certName,
      CertificateBody: cert,
      PrivateKey: certInfo.key,
      CertificateChain: chain || undefined,
    });

    try {
      const data = await iamClient.send(command);
      // 返回证书 ID
      return data.ServerCertificateMetadata.ServerCertificateId;
    } catch (err) {
      const message = err.message || String(err);
      const requestId = err.$metadata?.requestId || err.requestId;
      console.error(`IAM 调用失败: ${message}, requestId: ${requestId}`);
      throw err;
    }
  }

  // 拉取 /cloudfront/ path 下的全部 server certificate 元信息（处理分页）
  async listCloudFrontServerCertificates(): Promise<ServerCertificateMetadata[]> {
    const { iamClient, iamModule } = await this.createIamClient();
    const { ListServerCertificatesCommand } = iamModule;

    const metadataList: ServerCertificateMetadata[] = [];
    let marker: string | undefined = undefined;
    do {
      const command = new ListServerCertificatesCommand({
        PathPrefix: "/cloudfront/",
        Marker: marker,
      });
      const data: any = await iamClient.send(command);
      const pageList: ServerCertificateMetadata[] = data.ServerCertificateMetadataList || [];
      metadataList.push(...pageList);
      marker = data.IsTruncated ? data.Marker : undefined;
    } while (marker);

    return metadataList;
  }

  // 按名称删除 IAM server certificate
  async deleteServerCertificate(serverCertificateName: string) {
    const { iamClient, iamModule } = await this.createIamClient();
    const { DeleteServerCertificateCommand } = iamModule;
    const command = new DeleteServerCertificateCommand({
      ServerCertificateName: serverCertificateName,
    });
    await iamClient.send(command);
  }

  /**
   * 清理本次被替换掉的旧证书（无论是否过期）。
   * distribution 已改用新证书，旧证书不再被其引用，直接删除以避免 IAM 堆积。
   * 必须在更新完 CloudFront 引用之后调用，否则旧证书仍被引用会报 DeleteConflict。
   * 删除失败（如仍被其他分配引用）时只告警，不阻断部署流程。
   */
  async deleteReplacedCerts(params: { oldCertIds: Set<string> | string[]; newCertId?: string }) {
    const { oldCertIds, newCertId } = params;
    const targetIdSet = oldCertIds instanceof Set ? oldCertIds : new Set(oldCertIds);
    if (targetIdSet.size === 0) {
      return;
    }

    const metadataList = await this.listCloudFrontServerCertificates();
    const replacedCertNames = pickReplacedCertNames({
      metadataList,
      targetCertIds: targetIdSet,
      excludeCertId: newCertId,
    });

    if (replacedCertNames.length === 0) {
      this.logger?.info("没有需要清理的旧证书");
      return;
    }

    for (const certName of replacedCertNames) {
      try {
        await this.deleteServerCertificate(certName);
        this.logger?.info(`已删除被替换的旧证书: ${certName}`);
      } catch (err: any) {
        const message = err?.message || String(err);
        this.logger?.warn(`删除旧证书失败(可能仍被其他分配引用)，已跳过: ${certName}, 原因: ${message}`);
      }
    }
  }
}
