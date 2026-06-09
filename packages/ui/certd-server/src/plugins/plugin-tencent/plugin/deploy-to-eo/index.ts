import { AbstractTaskPlugin, IsTaskPlugin, pluginGroups, RunStrategy, TaskInput } from "@certd/pipeline";
import { createCertDomainGetterInputDefine, createRemoteSelectInputDefine } from "@certd/plugin-lib";

import { CertApplyPluginNames, CertInfo, CertReader } from "@certd/plugin-cert";
import { TencentAccess } from "../../../plugin-lib/tencent/access.js";
import { TencentSslClient } from "../../../plugin-lib/tencent/index.js";

@IsTaskPlugin({
  name: "DeployCertToTencentEO",
  title: "腾讯云-部署到腾讯云EO",
  icon: "svg:icon-tencentcloud",
  desc: "腾讯云边缘安全加速平台EdgeOne(EO)",
  group: pluginGroups.tencent.key,
  default: {
    strategy: {
      runStrategy: RunStrategy.SkipWhenSucceed,
    },
  },
})
export class DeployCertToTencentEO extends AbstractTaskPlugin {
  @TaskInput({
    title: "域名证书",
    helper: "请选择前置任务输出的域名证书，或者选择前置任务“上传证书到腾讯云”任务的证书ID",
    component: {
      name: "output-selector",
      from: [...CertApplyPluginNames, "UploadCertToTencent"],
    },
    required: true,
  })
  cert!: CertInfo | string;

  @TaskInput(createCertDomainGetterInputDefine({ props: { required: false } }))
  certDomains!: string[];

  @TaskInput({
    title: "Access提供者",
    helper: "access 授权",
    component: {
      name: "access-selector",
      type: "tencent",
    },
    required: true,
  })
  accessId!: string;

  @TaskInput(
    createRemoteSelectInputDefine({
      title: "站点ID",
      helper: "类似于zone-xxxx的字符串，在站点概览页面左上角，或者，站点列表页面站点名称下方",
      action: DeployCertToTencentEO.prototype.onGetZoneList.name,
      watches: ["certDomains", "accessId"],
      required: true,
      component: {
        name: "remote-auto-complete",
      },
    })
  )
  zoneId!: string;

  @TaskInput(
    createRemoteSelectInputDefine({
      title: "加速域名",
      helper: "请选择域名或输入域名",
      action: DeployCertToTencentEO.prototype.onGetDomainList.name,
    })
  )
  domainNames!: string[];

  @TaskInput({
    title: "证书名称",
    helper: "证书上传后将以此参数作为名称前缀",
  })
  certName!: string;

  // @TaskInput({
  //   title: "CDN接口",
  //   helper: "CDN接口端点",
  //   component: {
  //     name: "a-select",
  //     type: "tencent",
  //   },
  //   required: true,
  // })
  // endpoint!: string;
  Client: any;

  async onInstance() {
    const sdk = await import("tencentcloud-sdk-nodejs/tencentcloud/services/teo/v20220901/index.js");
    this.Client = sdk.v20220901.Client;
  }

  async execute(): Promise<void> {
    const accessProvider = await this.getAccess<TencentAccess>(this.accessId);
    const client = this.getClient(accessProvider);

    const sslClient = new TencentSslClient({
      access: accessProvider,
      logger: this.logger,
    });

    if (this.cert == null) {
      throw new Error("请选择域名证书");
    }

    let tencentCertId = this.cert as string;
    if (typeof this.cert !== "string") {
      const certReader = new CertReader(this.cert);
      tencentCertId = await sslClient.uploadToTencent({
        certName: certReader.buildCertName(),
        cert: this.cert,
      });
    }

    const params: any = {
      ZoneId: this.zoneId,
      Hosts: this.domainNames,
      Mode: "sslcert",
      ServerCertInfo: [
        {
          CertId: tencentCertId,
        },
      ],
    };
    this.logger.info("设置腾讯云EO证书参数:", JSON.stringify(params));
    await this.doRequest(client, params);
  }

  getClient(accessProvider: TencentAccess) {
    const TeoClient = this.Client;

    //teo.intl.tencentcloudapi.com
    const endpoint = `teo.${accessProvider.intlDomain()}tencentcloudapi.com`;
    const clientConfig = {
      credential: {
        secretId: accessProvider.secretId,
        secretKey: accessProvider.secretKey,
      },
      region: "",
      profile: {
        httpProfile: {
          endpoint,
        },
      },
    };

    return new TeoClient(clientConfig);
  }

  async doRequest(client: any, params: any) {
    const ret = await client.ModifyHostsCertificate(params);
    this.checkRet(ret);
    this.logger.info("设置腾讯云EO证书成功:", ret.RequestId);
    return ret.RequestId;
  }

  checkRet(ret: any) {
    if (!ret || ret.Error) {
      throw new Error("执行失败：" + ret.Error.Code + "," + ret.Error.Message);
    }
  }

  async onGetZoneList(data: any) {
    if (!this.accessId) {
      throw new Error("请选择授权");
    }
    const access: TencentAccess = await this.getAccess<TencentAccess>(this.accessId);
    const client = await this.getClient(access);
    const res = await client.DescribeZones({
      Limit: 100,
    });
    this.checkRet(res);
    const list = res.Zones;
    if (!list || list.length === 0) {
      return [];
    }
    return list.map((item: any) => {
      return {
        label: `${item.ZoneName}<${item.ZoneId}>`,
        value: item.ZoneId,
      };
    });
  }

  async onGetDomainList(data: any) {
    if (!this.accessId) {
      throw new Error("请选择授权");
    }
    const access: TencentAccess = await this.getAccess<TencentAccess>(this.accessId);
    const client = await this.getClient(access);
    const res = await client.DescribeAccelerationDomains({
      Limit: 200,
      ZoneId: this.zoneId,
    });
    this.checkRet(res);
    const list = res.AccelerationDomains;
    if (!list || list.length === 0) {
      return [];
    }
    const options = list.map((item: any) => {
      return {
        label: item.DomainName,
        value: item.DomainName,
        domain: item.DomainName,
      };
    });
    return this.ctx.utils.options.buildGroupOptions(options, this.certDomains);
  }
}

new DeployCertToTencentEO();
