import { AbstractTaskPlugin, IsTaskPlugin, pluginGroups, RunStrategy, TaskInput } from "@certd/pipeline";
import { CertApplyPluginNames, CertInfo } from "@certd/plugin-cert";
import { AwsAccess } from "../access.js";
import { AwsClient } from "../libs/aws-client.js";
import { createCertDomainGetterInputDefine, createRemoteSelectInputDefine } from "@certd/plugin-lib";
import { optionsUtils } from "@certd/basic";
import { AwsRegions } from "../constants.js";

@IsTaskPlugin({
  name: 'AwsDeployToCloudFront',
  title: 'AWS-部署证书到CloudFront',
  desc: '部署证书到 AWS CloudFront',
  icon: 'svg:icon-aws',
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
    title: '域名证书',
    helper: '请选择前置任务输出的域名证书',
    component: {
      name: 'output-selector',
      from: [...CertApplyPluginNames, 'AwsUploadToACM'],
    },
    required: true,
  })
  cert!: CertInfo | string;

  @TaskInput(createCertDomainGetterInputDefine({ props: { required: false } }))
  certDomains!: string[];

  @TaskInput({
    title: '区域',
    helper: '证书上传区域',
    component: {
      name: 'a-auto-complete',
      vModel: 'value',
      options: AwsRegions,
    },
    required: true,
  })
  region!: string;

  @TaskInput({
    title: 'Access授权',
    helper: 'aws的授权',
    component: {
      name: 'access-selector',
      type: 'aws',
    },
    required: true,
  })
  accessId!: string;

  @TaskInput(
    createRemoteSelectInputDefine({
      title: '分配ID',
      helper: '请选择distributions id',
      action: AwsDeployToCloudFront.prototype.onGetDistributions.name,
      required: true,
    })
  )
  distributionIds!: string[];

  async onInstance() {}

  async execute(): Promise<void> {
    const access = await this.getAccess<AwsAccess>(this.accessId);

    let certId = this.cert as string;
    if (typeof this.cert !== 'string') {
      //先上传
      certId = await this.uploadToACM(access, this.cert);
    }
    //部署到CloudFront

    const { CloudFrontClient, UpdateDistributionCommand, GetDistributionConfigCommand } = await import('@aws-sdk/client-cloudfront');
    const cloudFrontClient = new CloudFrontClient({
      region: this.region,
      credentials: {
        accessKeyId: access.accessKeyId,
        secretAccessKey: access.secretAccessKey,
      },
    });

    // update-distribution
    for (const distributionId of this.distributionIds) {
      // get-distribution-config
      const getDistributionConfigCommand = new GetDistributionConfigCommand({
        Id: distributionId,
      });

      const configData = await cloudFrontClient.send(getDistributionConfigCommand);

      const updateDistributionCommand = new UpdateDistributionCommand({
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
      });
      await cloudFrontClient.send(updateDistributionCommand);
      this.logger.info(`部署${distributionId}完成:`);
    }
    this.logger.info('部署完成');
  }

  private async uploadToACM(access: AwsAccess, cert: CertInfo) {
    const acmClient = new AwsClient({
      access,
      region: this.region,
      logger: this.logger,
    });
    const awsCertARN = await acmClient.importCertificate(cert);
    this.logger.info('证书上传成功,id=', awsCertARN);
    return awsCertARN;
  }

  //查找分配ID列表选项
  async onGetDistributions() {
    if (!this.accessId) {
      throw new Error('请选择Access授权');
    }

    const access = await this.getAccess<AwsAccess>(this.accessId);
    const { CloudFrontClient, ListDistributionsCommand } = await import('@aws-sdk/client-cloudfront');
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
      throw new Error('找不到CloudFront分配ID，您可以手动输入');
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
