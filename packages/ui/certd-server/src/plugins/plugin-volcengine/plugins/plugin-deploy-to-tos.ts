import { AbstractTaskPlugin, IsTaskPlugin, pluginGroups, RunStrategy, TaskInput } from "@certd/pipeline";
import { createCertDomainGetterInputDefine, createRemoteSelectInputDefine } from "@certd/plugin-lib";
import { CertApplyPluginNames, CertInfo } from "@certd/plugin-cert";
import { optionsUtils } from "@certd/basic";
import { VolcengineAccess } from "../access.js";
import { VolcengineClient } from "../ve-client.js";

@IsTaskPlugin({
  name: "VolcengineDeployToTOS",
  title: "火山引擎-部署证书至TOS自定义域名",
  icon: "svg:icon-volcengine",
  group: pluginGroups.volcengine.key,
  desc: "仅限TOS自定义域名，加速域名请选择火山引擎的CDN插件",
  default: {
    strategy: {
      runStrategy: RunStrategy.SkipWhenSucceed,
    },
  },
})
export class VolcengineDeployToTOS extends AbstractTaskPlugin {
  @TaskInput({
    title: "域名证书",
    helper: "请选择前置任务输出的域名证书",
    component: {
      name: "output-selector",
      from: [...CertApplyPluginNames, "VolcengineUploadToCertCenter"],
    },
    required: true,
  })
  cert!: CertInfo | string;

  @TaskInput(createCertDomainGetterInputDefine({ props: { required: false } }))
  certDomains!: string[];

  @TaskInput({
    title: "Access授权",
    helper: "火山引擎AccessKeyId、AccessKeySecret",
    component: {
      name: "access-selector",
      type: "volcengine",
    },
    required: true,
  })
  accessId!: string;

  @TaskInput({
    title: "地域",
    helper: "TOS服务所在地域",
    component: {
      name: "a-select",
      options: [
        { label: "华北2（北京）", value: "cn-beijing" },
        { label: "华东2（上海）", value: "cn-shanghai" },
        { label: "华南1（广州）", value: "cn-guangzhou" },
        { label: "中国香港", value: "cn-hongkong" },
        { label: "亚太东南（柔佛）", value: "ap-southeast-1" },
        { label: "亚太东南（雅加达）", value: "ap-southeast-3" },
      ],
    },
    value: "cn-beijing",
    required: true,
  })
  region = "cn-beijing";

  @TaskInput({
    title: "Bucket",
    helper: "存储桶名称",
    component: {
      name: "remote-auto-complete",
      vModel: "value",
      type: "plugin",
      action: "onGetBucketList",
      search: false,
      pager: false,
      watches: ["accessId", "region"],
    },
    required: true,
  })
  bucket!: string;

  @TaskInput(
    createRemoteSelectInputDefine({
      title: "TOS自定义域名",
      helper: "你在火山引擎上配置的TOS自定义域名，比如:example.com",
      action: VolcengineDeployToTOS.prototype.onGetDomainList.name,
      watches: ["certDomains", "accessId", "region", "bucket"],
      required: true,
    })
  )
  domainName!: string | string[];

  async onInstance() {}
  async execute(): Promise<void> {
    this.logger.info("开始部署证书到火山引擎TOS自定义域名");
    const access = await this.getAccess<VolcengineAccess>(this.accessId);

    this.logger.info(`bucket: ${this.bucket}, region: ${this.region}, domainName: ${this.domainName}`);

    const client = new VolcengineClient({
      logger: this.logger,
      access,
      http: this.http,
    });

    const tosService = await client.getTOSService({ region: this.region });

    if (!this.cert) {
      throw new Error("你还未选择证书");
    }
    let certId = this.cert;
    if (typeof certId !== "string") {
      const certInfo = this.cert as CertInfo;
      this.logger.info(`开始上传证书`);
      const certService = await client.getCertCenterService();
      certId = await certService.ImportCertificate({
        certName: this.appendTimeSuffix("certd"),
        cert: certInfo,
      });
      this.logger.info(`上传证书成功：${certId}`);
    } else {
      this.logger.info(`使用已有证书ID：${certId}`);
    }

    for (const domain of this.domainName) {
      this.logger.info(`开始部署域名${domain}证书`);
      await tosService.putBucketCustomDomain({
        bucket: this.bucket,
        customDomainRule: {
          Domain: domain,
          CertId: certId as string,
        },
      });
      this.logger.info(`部署域名${domain}证书成功`);
      await this.ctx.utils.sleep(1000);
    }

    this.logger.info("部署完成");
  }

  async onGetDomainList(data: any) {
    if (!this.accessId || !this.bucket) {
      throw new Error("请选择Access授权和Bucket");
    }
    const access = await this.getAccess<VolcengineAccess>(this.accessId);

    const client = new VolcengineClient({
      logger: this.logger,
      access,
      http: this.http,
    });

    const tosService = await client.getTOSService({ region: this.region });

    const res = await tosService.getBucketCustomDomain({
      bucket: this.bucket,
    });

    const list = res?.data?.CustomDomainRules || [];
    if (!list || list.length === 0) {
      throw new Error("找不到TOS自定义域名，您可以手动输入");
    }

    const options = list.map((item: any) => {
      return {
        value: item.Domain,
        label: item.Domain,
        domain: item.Domain,
      };
    });

    return optionsUtils.buildGroupOptions(options, this.certDomains);
  }

  async onGetBucketList(data: any) {
    if (!this.accessId) {
      throw new Error("请选择Access授权");
    }
    const access = await this.getAccess<VolcengineAccess>(this.accessId);

    const client = new VolcengineClient({
      logger: this.logger,
      access,
      http: this.http,
    });

    const tosService = await client.getTOSService({ region: this.region });

    const res = await tosService.listBuckets();

    const buckets = res?.data?.Buckets || [];
    return buckets.map((bucket: any) => ({
      label: `${bucket.Name}<${bucket.Location}>`,
      value: bucket.Name,
    }));
  }
}
new VolcengineDeployToTOS();
