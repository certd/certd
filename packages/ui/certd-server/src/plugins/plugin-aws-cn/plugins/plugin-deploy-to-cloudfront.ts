import { AbstractTaskPlugin, IsTaskPlugin, pluginGroups, RunStrategy, TaskInput } from "@certd/pipeline";
import { CertApplyPluginNames, CertInfo } from "@certd/plugin-cert";
import { AwsCNAccess } from "../access.js";
import { AwsIAMClient, buildIamViewerCertificate } from "../libs/aws-iam-client.js";
import { createCertDomainGetterInputDefine, createRemoteSelectInputDefine } from "@certd/plugin-lib";
import { AwsCNRegions } from "../constants.js";

@IsTaskPlugin({
  name: "AwsCNDeployToCloudFront",
  title: "AWS(国区)-部署证书到CloudFront",
  desc: "部署证书到 AWS CloudFront",
  icon: "svg:icon-aws",
  group: pluginGroups.aws.key,
  needPlus: false,
  default: {
    strategy: {
      runStrategy: RunStrategy.SkipWhenSucceed,
    },
  },
})
export class AwsCNDeployToCloudFront extends AbstractTaskPlugin {
  @TaskInput({
    title: "域名证书",
    helper: "请选择前置任务输出的域名证书",
    component: {
      name: "output-selector",
      from: [...CertApplyPluginNames, "AwsUploadToACM"],
    },
    required: true,
  })
  cert!: CertInfo | string;

  @TaskInput(createCertDomainGetterInputDefine({ props: { required: false } }))
  certDomains!: string[];

  @TaskInput({
    title: "区域",
    helper: "证书上传区域",
    component: {
      name: "a-auto-complete",
      vModel: "value",
      options: AwsCNRegions,
    },
    required: true,
  })
  region!: string;

  @TaskInput({
    title: "Access授权",
    helper: "aws的授权",
    component: {
      name: "access-selector",
      type: "aws-cn",
    },
    required: true,
  })
  accessId!: string;

  @TaskInput({
    title: "证书名称",
    helper: "上传后将以此名称作为前缀备注",
  })
  certName!: string;

  @TaskInput(
    createRemoteSelectInputDefine({
      title: "分配ID",
      helper: "请选择distributions id",
      action: AwsCNDeployToCloudFront.prototype.onGetDistributions.name,
      required: true,
    })
  )
  distributionIds!: string[];

  async onInstance() {}

  async execute(): Promise<void> {
    const access = await this.getAccess<AwsCNAccess>(this.accessId);

    const iamClient = new AwsIAMClient({
      access,
      region: this.region,
      logger: this.logger,
    });

    // 本次是否真正上传了新证书（cert 为字符串时表示直接使用已有证书ID，不涉及替换过期旧证书）
    const uploadedNewCert = typeof this.cert !== "string";

    let certId = this.cert as string;
    if (uploadedNewCert) {
      //先上传
      certId = await this.uploadToIAM(iamClient, this.cert as CertInfo);
    }
    //部署到CloudFront

    const { CloudFrontClient, UpdateDistributionCommand, GetDistributionConfigCommand } = await this.importRuntime("@aws-sdk/client-cloudfront");
    const cloudFrontClient = new CloudFrontClient({
      region: this.region,
      credentials: {
        accessKeyId: access.accessKeyId,
        secretAccessKey: access.secretAccessKey,
      },
    });

    // 记录每个分配部署前引用的旧 IAM 证书ID，部署完成后清理其中已过期的
    const oldCertIds = new Set<string>();

    // update-distribution
    for (const distributionId of this.distributionIds) {
      // get-distribution-config
      const getDistributionConfigCommand = new GetDistributionConfigCommand({
        Id: distributionId,
      });

      const configData: any = await this.sendCloudFrontCommand(() => cloudFrontClient.send(getDistributionConfigCommand), `获取CloudFront配置(${distributionId})`);

      const oldViewerCertificate = configData.DistributionConfig?.ViewerCertificate;
      const oldCertId = oldViewerCertificate?.IAMCertificateId;
      if (oldCertId) {
        oldCertIds.add(oldCertId);
      }

      // 使用干净的 IAM ViewerCertificate，避免与旧的 ACM/默认证书字段冲突导致 InvalidViewerCertificate
      const viewerCertificate = buildIamViewerCertificate({ oldViewerCertificate, certId });

      const updateDistributionCommand = new UpdateDistributionCommand({
        DistributionConfig: {
          ...configData.DistributionConfig,
          ViewerCertificate: viewerCertificate,
        },
        Id: distributionId,
        IfMatch: configData.ETag,
      });
      await this.sendCloudFrontCommand(() => cloudFrontClient.send(updateDistributionCommand), `更新CloudFront证书(${distributionId})`);
      this.logger.info(`部署${distributionId}完成:`);
    }
    this.logger.info("部署完成");

    // 仅当本次上传了新证书时，清理被替换掉的旧证书（无论是否过期）；清理失败不影响部署结果
    if (uploadedNewCert) {
      try {
        await iamClient.deleteReplacedCerts({ oldCertIds, newCertId: certId });
      } catch (err: any) {
        this.logger.warn(`清理旧证书失败，已忽略: ${err?.message || err}`);
      }
    }
  }

  /**
   * 统一包装 CloudFront 调用错误。
   * 命中 AWS 权限不足（AccessDenied / not authorized）时，抛出可读的中文提示，
   * 指明该 IAM 用户需要补充的 CloudFront 与 IAM 权限，方便运维在 AWS 控制台排查。
   */
  private async sendCloudFrontCommand<T>(action: () => Promise<T>, actionDesc: string): Promise<T> {
    try {
      return await action();
    } catch (err: any) {
      const message = err?.message || String(err);
      const isAuthError = err?.name === "AccessDenied" || /not authorized to perform|no identity-based policy/i.test(message);
      if (isAuthError) {
        const requiredPermissions = ["cloudfront:ListDistributions", "cloudfront:GetDistributionConfig", "cloudfront:UpdateDistribution", "iam:UploadServerCertificate"].join("、");
        throw new Error(`${actionDesc}失败：AWS 账号权限不足，请为该 IAM 用户附加 CloudFront 部署所需权限（${requiredPermissions}）。原始错误：${message}`);
      }
      throw err;
    }
  }

  private async uploadToIAM(iamClient: AwsIAMClient, cert: CertInfo) {
    const awsCertID = await iamClient.importCertificate(cert, this.appendTimeSuffix(this.certName));
    this.logger.info("证书上传成功,id=", awsCertID);
    return awsCertID;
  }

  //查找分配ID列表选项
  async onGetDistributions() {
    if (!this.accessId) {
      throw new Error("请选择Access授权");
    }

    const access = await this.getAccess<AwsCNAccess>(this.accessId);
    const { CloudFrontClient, ListDistributionsCommand } = await this.importRuntime("@aws-sdk/client-cloudfront");
    const cloudFrontClient = new CloudFrontClient({
      region: this.region,
      credentials: {
        accessKeyId: access.accessKeyId,
        secretAccessKey: access.secretAccessKey,
      },
    });
    // list-distributions
    const listDistributionsCommand = new ListDistributionsCommand({});
    const data = await cloudFrontClient.send(listDistributionsCommand);
    const distributions = data.DistributionList?.Items;
    if (!distributions || distributions.length === 0) {
      throw new Error("找不到CloudFront分配ID，您可以手动输入");
    }

    const options = distributions.map((item: any) => {
      return {
        value: item.Id,
        label: `${item.DomainName}<${item.Id}>`,
        domain: item.DomainName,
      };
    });
    return this.ctx.utils.options.buildGroupOptions(options, this.certDomains);
  }
}

new AwsCNDeployToCloudFront();
