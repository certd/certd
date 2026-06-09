// 导入所需的 SDK 模块
import { AwsCNAccess } from "../access.js";
import { CertInfo } from "@certd/plugin-cert";

type AwsIAMClientOptions = { access: AwsCNAccess; region: string };

export class AwsIAMClient {
  options: AwsIAMClientOptions;
  access: AwsCNAccess;
  region: string;
  constructor(options: AwsIAMClientOptions) {
    this.options = options;
    this.access = options.access;
    this.region = options.region;
  }
  async importCertificate(certInfo: CertInfo, certName: string) {
    // 创建 IAM 客户端
    const { IAMClient, UploadServerCertificateCommand } = await import("@aws-sdk/client-iam");
    const iamClient = new IAMClient({
      region: this.region, // 替换为您的 AWS 区域
      credentials: {
        accessKeyId: this.access.accessKeyId, // 从环境变量中读取
        secretAccessKey: this.access.secretAccessKey,
      },
    });

    const cert = certInfo.crt.split("-----END CERTIFICATE-----")[0] + "-----END CERTIFICATE-----";
    const chain = certInfo.crt.split("-----END CERTIFICATE-----\n")[1];
    // 构建上传参数
    const command = new UploadServerCertificateCommand({
      Path: "/cloudfront/",
      ServerCertificateName: certName,
      CertificateBody: cert,
      PrivateKey: certInfo.key,
      CertificateChain: chain,
    });
    const data = await iamClient.send(command);
    console.log("Upload successful:", data);
    // 返回证书 ID
    return data.ServerCertificateMetadata.ServerCertificateId;
  }
}
