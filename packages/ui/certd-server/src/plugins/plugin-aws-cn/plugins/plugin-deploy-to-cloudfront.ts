import { AbstractTaskPlugin, IsTaskPlugin, pluginGroups, RunStrategy, TaskInput } from "@certd/pipeline";
import { CertApplyPluginNames, CertInfo } from "@certd/plugin-cert";
import { AwsCNAccess } from "../access.js";
import { AwsIAMClient } from "../libs/aws-iam-client.js";
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

    let certId = this.cert as string;
    if (typeof this.cert !== "string") {
      //先上传
      certId = await this.uploadToIAM(access, this.cert);
    }
    //部署到CloudFront

    const { CloudFrontClient, UpdateDistributionCommand, GetDistributionConfigCommand } = await import("@aws-sdk/client-cloudfront");
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
            IAMCertificateId: certId,
          },
        },
        Id: distributionId,
        IfMatch: configData.ETag,
      });
      await cloudFrontClient.send(updateDistributionCommand);
      this.logger.info(`部署${distributionId}完成:`);
    }
    this.logger.info("部署完成");
  }

  private async uploadToIAM(access: AwsCNAccess, cert: CertInfo) {
    const acmClient = new AwsIAMClient({
      access,
      region: this.region,
    });
    const awsCertID = await acmClient.importCertificate(cert, this.appendTimeSuffix(this.certName));
    this.logger.info("证书上传成功,id=", awsCertID);
    return awsCertID;
  }

  //查找分配ID列表选项
  async onGetDistributions() {
    if (!this.accessId) {
      throw new Error("请选择Access授权");
    }

    const access = await this.getAccess<AwsCNAccess>(this.accessId);
    const { CloudFrontClient, ListDistributionsCommand } = await import("@aws-sdk/client-cloudfront");
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
