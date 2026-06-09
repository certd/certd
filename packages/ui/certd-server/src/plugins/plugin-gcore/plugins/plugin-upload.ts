import { AbstractTaskPlugin, IsTaskPlugin, pluginGroups, RunStrategy, TaskInput } from "@certd/pipeline";
import { CertInfo } from "@certd/plugin-cert";
import { GcoreAccess } from "../access.js";
import { CertApplyPluginNames } from "@certd/plugin-cert";
@IsTaskPlugin({
  name: "Gcoreupload",
  title: "Gcore-部署证书到Gcore",
  desc: "仅上传 并不会部署到cdn",
  icon: "clarity:plugin-line",
  group: pluginGroups.cdn.key,
  default: {
    strategy: {
      runStrategy: RunStrategy.SkipWhenSucceed,
    },
  },
})
export class GcoreuploadPlugin extends AbstractTaskPlugin {
  @TaskInput({
    title: "证书名称",
    helper: "作为备注",
  })
  certName!: string;

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
  @TaskInput({
    title: "Access授权",
    helper: "Gcore",
    component: {
      name: "access-selector",
      type: "Gcore",
    },
    required: true,
  })
  accessId!: string;

  async onInstance() {}

  async execute(): Promise<void> {
    const { cert, accessId } = this;
    const access = (await this.getAccess(accessId)) as GcoreAccess;

    const token = await access.login();
    this.logger.info("Token 获取成功");
    this.logger.info("开始上传证书");
    await access.doRequestApi(
      `/cdn/sslData`,
      {
        name: this.certName,
        sslCertificate: cert.crt,
        sslPrivateKey: cert.key,
        validate_root_ca: true,
      },
      "post",
      token
    );
    this.logger.info("证书上传成功");
  }
}

new GcoreuploadPlugin();
