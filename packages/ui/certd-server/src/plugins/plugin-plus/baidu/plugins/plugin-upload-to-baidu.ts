import { AbstractTaskPlugin, IsTaskPlugin, pluginGroups, RunStrategy, TaskInput, TaskOutput } from "@certd/pipeline";
import { CertApplyPluginNames, CertReader } from "@certd/plugin-cert";
import { BaiduAccess } from "../access.js";
import { BaiduYunCertClient } from "../client.js";

@IsTaskPlugin({
  name: "BaiduUploadCert",
  title: "百度云-上传到证书托管",
  icon: "ant-design:baidu-outlined",
  desc: "上传证书到百度云证书托管中心",
  group: pluginGroups.baidu.key,
  default: {
    strategy: {
      runStrategy: RunStrategy.SkipWhenSucceed,
    },
  },
})
export class BaiduUploadCert extends AbstractTaskPlugin {
  // @TaskInput({ title: '证书名称' })
  // name!: string;

  @TaskInput({
    title: "域名证书",
    helper: "请选择前置任务输出的域名证书",
    component: {
      name: "output-selector",
      from: [...CertApplyPluginNames],
    },
    required: true,
  })
  cert!: any;

  @TaskInput({
    title: "Access授权",
    helper: "access授权",
    component: {
      name: "access-selector",
      type: "baidu",
    },
    required: true,
  })
  accessId!: string;

  @TaskOutput({
    title: "百度云CertId",
  })
  baiduCertId?: string;

  async execute(): Promise<void> {
    const access = await this.getAccess<BaiduAccess>(this.accessId);

    const certClient = new BaiduYunCertClient({
      access,
      logger: this.logger,
      http: this.http,
    });

    const certItem = await certClient.createCert({
      cert: this.cert,
      certName: CertReader.buildCertName(this.cert),
    });

    this.baiduCertId = certItem.certId;
    this.logger.info(`上传成功，证书ID：${certItem.certId}`);
  }
}

new BaiduUploadCert();
