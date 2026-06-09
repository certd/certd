import { AbstractTaskPlugin, IsTaskPlugin, pluginGroups, RunStrategy, TaskInput, TaskOutput } from "@certd/pipeline";
import { CertApplyPluginNames, CertReader } from "@certd/plugin-cert";
import { TencentAccess } from "../../../plugin-lib/tencent/access.js";
import { TencentSslClient } from "../../../plugin-lib/tencent/index.js";

@IsTaskPlugin({
  name: "UploadCertToTencent",
  title: "腾讯云-上传证书到腾讯云",
  icon: "svg:icon-tencentcloud",
  desc: "上传成功后输出：tencentCertId",
  group: pluginGroups.tencent.key,
  default: {
    strategy: {
      runStrategy: RunStrategy.SkipWhenSucceed,
    },
  },
})
export class UploadCertToTencent extends AbstractTaskPlugin {
  // @TaskInput({ title: '证书名称' })
  // name!: string;

  @TaskInput({
    title: "Access授权",
    helper: "access授权",
    component: {
      name: "access-selector",
      type: "tencent",
    },
    required: true,
  })
  accessId!: string;

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

  @TaskOutput({
    title: "上传成功后的腾讯云CertId",
  })
  tencentCertId?: string;

  Client: any;
  async onInstance() {
    const sdk = await import("tencentcloud-sdk-nodejs/tencentcloud/services/ssl/v20191205/index.js");
    this.Client = sdk.v20191205.Client;
  }

  async execute(): Promise<void> {
    const access = await this.getAccess<TencentAccess>(this.accessId);
    const sslClient = new TencentSslClient({
      access,
      logger: this.logger,
    });

    const certReader = new CertReader(this.cert);
    const tencentCertId = await sslClient.uploadToTencent({
      certName: certReader.buildCertName(),
      cert: this.cert,
    });

    this.tencentCertId = tencentCertId;
  }

  checkRet(ret: any) {
    if (!ret || ret.Error) {
      throw new Error("执行失败：" + ret.Error.Code + "," + ret.Error.Message);
    }
  }
}
