import { AbstractTaskPlugin, IsTaskPlugin, pluginGroups, RunStrategy, TaskInput } from "@certd/pipeline";
import { createCertDomainGetterInputDefine, createRemoteSelectInputDefine } from "@certd/plugin-lib";
import { CertApplyPluginNames, CertInfo } from "@certd/plugin-cert";
import { optionsUtils } from "@certd/basic";
import { AliyunAccess } from "../../../plugin-lib/aliyun/access/index.js";

@IsTaskPlugin({
  name: "DeployCertToAliyunApiGateway",
  title: "阿里云-部署证书至API网关",
  icon: "svg:icon-aliyun",
  group: pluginGroups.aliyun.key,
  desc: "自动部署域名证书至阿里云API网关（APIGateway）",
  default: {
    strategy: {
      runStrategy: RunStrategy.SkipWhenSucceed,
    },
  },
})
export class DeployCertToAliyunApiGateway extends AbstractTaskPlugin {
  @TaskInput({
    title: "域名证书",
    helper: "请选择前置任务输出的域名证书",
    component: {
      name: "output-selector",
      from: [...CertApplyPluginNames],
    },
    required: true,
  })
  cert!: CertInfo;

  @TaskInput(createCertDomainGetterInputDefine({ props: { required: false } }))
  certDomains!: string[];

  @TaskInput({
    title: "Access授权",
    helper: "阿里云授权AccessKeyId、AccessKeySecret",
    component: {
      name: "access-selector",
      type: "aliyun",
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
      title: "区域",
      helper: "请选择区域",
      action: DeployCertToAliyunApiGateway.prototype.onGetRegionList.name,
      watches: ["certDomains", "accessId"],
      required: true,
      component: {
        name: "remote-auto-complete",
      },
    })
  )
  regionEndpoint!: string;

  @TaskInput(
    createRemoteSelectInputDefine({
      title: "API分组",
      helper: "请选择API分组",
      action: DeployCertToAliyunApiGateway.prototype.onGetGroupList.name,
      watches: ["regionEndpoint", "accessId"],
      required: true,
      component: {
        name: "remote-auto-complete",
      },
    })
  )
  groupId!: string;

  @TaskInput(
    createRemoteSelectInputDefine({
      title: "绑定域名",
      helper: "在API分组上配置的绑定域名",
      action: DeployCertToAliyunApiGateway.prototype.onGetDomainList.name,
      watches: ["groupId", "regionEndpoint", "accessId"],
      required: true,
    })
  )
  customDomains!: string[];

  async onInstance() {}
  async execute(): Promise<void> {
    this.logger.info("开始部署证书到阿里云Api网关");
    if (!this.customDomains) {
      throw new Error("您还未选择域名");
    }
    const access = await this.getAccess<AliyunAccess>(this.accessId);
    const client = access.getClient(this.regionEndpoint);

    for (const domainName of this.customDomains) {
      this.logger.info(`[${domainName}]开始部署`);
      await this.updateCert(client, domainName);
      this.logger.info(`[${domainName}]部署成功`);
    }

    this.logger.info("部署完成");
  }

  async updateCert(client: any, domainName: string) {
    const ret = await client.doRequest({
      // 接口名称
      action: "SetDomainCertificate",
      // 接口版本
      version: "2016-07-14",
      data: {
        query: {
          GroupId: this.groupId,
          DomainName: domainName,
          CertificateName: this.buildCertName(domainName),
          CertificateBody: this.cert.crt,
          CertificatePrivateKey: this.cert.key,
        },
      },
    });
    this.logger.info(`设置${domainName}证书成功:`, ret.RequestId);
  }

  async onGetGroupList(data: any) {
    if (!this.accessId) {
      throw new Error("请选择Access授权");
    }
    if (!this.regionEndpoint) {
      throw new Error("请选择区域");
    }
    const access = await this.getAccess<AliyunAccess>(this.accessId);
    const client = access.getClient(this.regionEndpoint);
    const res = await client.doRequest({
      // 接口名称
      action: "DescribeApiGroups",
      // 接口版本
      version: "2016-07-14",
      data: {},
    });
    const list = res?.ApiGroupAttributes?.ApiGroupAttribute;
    if (!list || list.length === 0) {
      throw new Error("没有数据，您可以手动输入API网关ID");
    }
    return list.map((item: any) => {
      return {
        value: item.GroupId,
        label: `${item.GroupName}<${item.GroupId}>`,
      };
    });
  }

  async onGetDomainList(data: any) {
    if (!this.accessId) {
      throw new Error("请选择Access授权");
    }
    if (!this.regionEndpoint) {
      throw new Error("请选择区域");
    }
    if (!this.groupId) {
      throw new Error("请选择分组");
    }
    const access = await this.getAccess<AliyunAccess>(this.accessId);

    const client = access.getClient(this.regionEndpoint);

    const res = await client.doRequest({
      // 接口名称
      action: "DescribeApiGroup",
      // 接口版本
      version: "2016-07-14",
      data: {
        query: {
          GroupId: this.groupId,
        },
      },
    });
    const list = res?.CustomDomains?.DomainItem;
    if (!list || list.length === 0) {
      throw new Error("没有数据，您可以手动输入");
    }
    const options = list.map((item: any) => {
      return {
        value: item.DomainName,
        label: `${item.DomainName}<${item.CertificateName}>`,
        domain: item.DomainName,
      };
    });
    return optionsUtils.buildGroupOptions(options, this.certDomains);
  }

  async onGetRegionList(data: any) {
    if (!this.accessId) {
      throw new Error("请选择Access授权");
    }
    const access = await this.getAccess<AliyunAccess>(this.accessId);

    const client = access.getClient("apigateway.cn-hangzhou.aliyuncs.com");

    const res = await client.doRequest({
      // 接口名称
      action: "DescribeRegions",
      // 接口版本
      version: "2016-07-14",
      data: {},
    });
    const list = res.Regions.Region;
    if (!list || list.length === 0) {
      throw new Error("没有数据，您可以手动输入");
    }
    return list.map((item: any) => {
      return {
        value: item.RegionEndpoint,
        label: item.LocalName,
        endpoint: item.RegionEndpoint,
        regionId: item.RegionId,
      };
    });
  }
}
new DeployCertToAliyunApiGateway();
