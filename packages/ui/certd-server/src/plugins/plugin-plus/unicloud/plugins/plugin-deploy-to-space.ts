import { AbstractTaskPlugin, IsTaskPlugin, pluginGroups, RunStrategy, TaskInput } from "@certd/pipeline";
import { CertApplyPluginNames, CertInfo } from "@certd/plugin-cert";
import { UniCloudAccess } from "../access.js";
import { UniCloudClient } from "../client.js";

@IsTaskPlugin({
  name: "UniCloudDeployToSpace",
  title: "uniCloud-部署到服务空间",
  icon: "material-symbols:shield-outline",
  group: pluginGroups.panel.key,
  desc: "部署到服务空间",
  default: {
    strategy: {
      runStrategy: RunStrategy.SkipWhenSucceed,
    },
  },
  needPlus: false,
})
export class UniCloudDeployToSpace extends AbstractTaskPlugin {
  //证书选择，此项必须要有
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

  //授权选择框
  @TaskInput({
    title: "uniCloud授权",
    helper: "uniCloud授权",
    component: {
      name: "access-selector",
      type: "unicloud",
    },
    required: true,
  })
  accessId!: string;

  //测试参数
  @TaskInput({
    title: "服务空间ID",
    component: {
      name: "a-input",
      vModel: "value",
    },
    helper: "spaceId",
  })
  spaceId!: string;

  @TaskInput({
    title: "空间提供商",
    component: {
      name: "a-select",
      vModel: "value",
      options: [
        {
          label: "阿里云",
          value: "aliyun",
        },
        {
          label: "腾讯云",
          value: "tencent",
        },
        {
          label: "支付宝云",
          value: "alipay",
        },
      ],
    },
    helper: "空间提供商",
  })
  provider!: string;

  @TaskInput({
    title: "空间域名",
    component: {
      name: "a-select",
      vModel: "value",
      mode: "tags",
      open: false,
    },
    helper: "空间域名",
  })
  domains!: string[];

  async onInstance() {}
  async execute(): Promise<void> {
    const access = await this.getAccess<UniCloudAccess>(this.accessId);
    const client = new UniCloudClient({
      access,
      logger: this.logger,
      http: this.http,
    });

    for (const domain of this.domains) {
      await client.createCert({
        domain,
        provider: this.provider,
        spaceId: this.spaceId,
        cert: this.cert,
      });
    }
    this.logger.info("部署成功");
  }
}
new UniCloudDeployToSpace();
