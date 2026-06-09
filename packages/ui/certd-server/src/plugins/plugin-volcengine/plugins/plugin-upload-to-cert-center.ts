import { AbstractTaskPlugin, IsTaskPlugin, pluginGroups, RunStrategy, TaskInput, TaskOutput } from "@certd/pipeline";
import { createCertDomainGetterInputDefine } from "@certd/plugin-lib";
import { CertApplyPluginNames, CertInfo } from "@certd/plugin-cert";
import { VolcengineAccess } from "../access.js";
import { VolcengineClient } from "../ve-client.js";

@IsTaskPlugin({
  name: "VolcengineUploadToCertCenter",
  title: "火山引擎-上传证书至证书中心",
  icon: "svg:icon-volcengine",
  group: pluginGroups.volcengine.key,
  desc: "上传证书至火山引擎证书中心",
  default: {
    strategy: {
      runStrategy: RunStrategy.SkipWhenSucceed,
    },
  },
})
export class VolcengineUploadToCertCenter extends AbstractTaskPlugin {
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
    helper: "火山引擎AccessKeyId、AccessKeySecret",
    component: {
      name: "access-selector",
      type: "volcengine",
    },
    required: true,
  })
  accessId!: string;

  @TaskOutput({
    title: "上传成功后的火山引擎证书Id",
  })
  volcengineCertId?: string;

  async onInstance() {}
  async execute(): Promise<void> {
    this.logger.info("开始上传证书到证书中心");
    const access = await this.getAccess<VolcengineAccess>(this.accessId);

    const client = await this.getClient(access);
    const service = await client.getCertCenterService();
    const certInfo = this.cert;
    this.logger.info(`开始上传证书`);
    this.volcengineCertId = await service.ImportCertificate({
      certName: this.appendTimeSuffix("certd"),
      cert: certInfo,
    });
    this.logger.info(`上传完成：${this.volcengineCertId}`);
  }

  async getClient(access: VolcengineAccess) {
    return new VolcengineClient({
      logger: this.logger,
      access,
      http: this.http,
    });
  }
}
new VolcengineUploadToCertCenter();
