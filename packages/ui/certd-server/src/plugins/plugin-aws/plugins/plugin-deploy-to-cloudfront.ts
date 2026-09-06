import { AbstractTaskPlugin, IsTaskPlugin, pluginGroups, RunStrategy, TaskInput } from "@certd/pipeline";
import { CertApplyPluginNames, CertInfo } from "@certd/plugin-cert";
import { AwsAccess } from "../access.js";
import { AwsClient } from "../libs/aws-client.js";
import { createCertDomainGetterInputDefine, createRemoteSelectInputDefine } from "@certd/plugin-lib";
import { optionsUtils } from "@certd/basic";
import { AwsRegions } from "../constants.js";

@IsTaskPlugin({
  name: "AwsDeployToCloudFront",
  title: "AWS-部署证书到CloudFront",
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
export class AwsDeployToCloudFront extends AbstractTaskPlugin {
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
      options: AwsRegions,
    },
    required: true,
  })
  region!: string;

  @TaskInput({
    title: "Access授权",
    helper: "aws的授权",
    component: {
      name: "access-selector",
      type: "aws",
    },
    required: true,
  })
  accessId!: string;

  @TaskInput(
    createRemoteSelectInputDefine({
      title: "分配ID",
      helper: "请选择distributions id",
      action: AwsDeployToCloudFront.prototype.onGetDistributions.name,
      required: true,
    })
  )
  distributionIds!: string[];

  @TaskInput({
    title: "等待部署完成",
    value: false,
    helper: "开启后，会轮询等待每个CloudFront分配状态变为Deployed（通常需要几分钟）再结束任务。" + "关闭时，提交证书更新后立即结束——CloudFront会在后台自行完成部署。" + "仅当后续任务依赖证书已全球生效时才需要开启。",
    component: {
      name: "a-switch",
      vModel: "checked",
    },
  })
  waitForDeployed = false;

  async onInstance() {}

  async execute(): Promise<void> {
    const access = await this.getAccess<AwsAccess>(this.accessId);

    const acmClient = new AwsClient({
      access,
      region: this.region,
      logger: this.logger,
    });

    let certId = this.cert as string;
    if (typeof this.cert !== "string") {
      //先上传
      certId = await this.uploadToACM(acmClient, this.cert);
    }
    //部署到CloudFront

    const { CloudFrontClient, UpdateDistributionCommand, GetDistributionConfigCommand } = await this.importRuntime("@aws-sdk/client-cloudfront");
    const cloudFrontClient = new CloudFrontClient({
      region: this.region,
      credentials: {
        accessKeyId: access.accessKeyId,
        secretAccessKey: access.secretAccessKey,
      },
      // Disable the SDK's own retries; acmClient.withRetry is the single retry authority.
      maxAttempts: 1,
    });

    // update-distribution
    for (const distributionId of this.distributionIds) {
      // get-distribution-config (with retry for throttling)
      const configData: any = await acmClient.withRetry(() => cloudFrontClient.send(new GetDistributionConfigCommand({ Id: distributionId })));

      await acmClient.withRetry(() =>
        cloudFrontClient.send(
          new UpdateDistributionCommand({
            DistributionConfig: {
              ...configData.DistributionConfig,
              ViewerCertificate: {
                ...configData.DistributionConfig.ViewerCertificate,
                CloudFrontDefaultCertificate: false,
                ACMCertificateArn: certId,
              },
            },
            Id: distributionId,
            IfMatch: configData.ETag,
          })
        )
      );

      if (this.waitForDeployed) {
        this.logger.info(`证书已提交到 ${distributionId}，等待全局部署完成…`);
        // CloudFront propagates globally in a few minutes; only block when the
        // user opts in (e.g. a downstream task needs the cert already live).
        await acmClient.waitForDistributionDeployed(cloudFrontClient, distributionId);
        this.logger.info(`部署 ${distributionId} 完成`);
      } else {
        this.logger.info(`证书已提交到 ${distributionId}，CloudFront 将在后台完成部署`);
      }
    }
    this.logger.info("部署完成");
  }

  private async uploadToACM(acmClient: AwsClient, cert: CertInfo) {
    const awsCertARN = await acmClient.withRetry(() => acmClient.importCertificate(cert));
    this.logger.info("证书上传成功,id=", awsCertARN);
    return awsCertARN;
  }

  //查找分配ID列表选项
  async onGetDistributions() {
    if (!this.accessId) {
      throw new Error("请选择Access授权");
    }

    const access = await this.getAccess<AwsAccess>(this.accessId);
    const { CloudFrontClient, ListDistributionsCommand } = await this.importRuntime("@aws-sdk/client-cloudfront");
    const cloudFrontClient = new CloudFrontClient({
      region: this.region,
      credentials: {
        accessKeyId: access.accessKeyId,
        secretAccessKey: access.secretAccessKey,
      },
      maxAttempts: 1,
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
    return optionsUtils.buildGroupOptions(options, this.certDomains);
  }
}

new AwsDeployToCloudFront();
