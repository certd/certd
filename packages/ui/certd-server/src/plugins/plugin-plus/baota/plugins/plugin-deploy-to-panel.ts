import { IsTaskPlugin, pluginGroups, RunStrategy, TaskInput } from "@certd/pipeline";
import { CertInfo } from "@certd/plugin-cert";
import { BaotaClient } from "../lib/client.js";
import { AbstractPlusTaskPlugin } from "@certd/plugin-lib";
import { CertApplyPluginNames } from "@certd/plugin-cert";
@IsTaskPlugin({
  name: "BaotaDeployPanelCert",
  title: "宝塔-面板证书部署",
  icon: "svg:icon-bt",
  group: pluginGroups.panel.key,
  desc: "部署宝塔面板本身的ssl证书",
  default: {
    strategy: {
      runStrategy: RunStrategy.SkipWhenSucceed,
    },
  },
  needPlus: true,
})
export class BaotaDeployPanelCertPlugin extends AbstractPlusTaskPlugin {
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
    title: "宝塔授权",
    helper: "baota的接口密钥",
    component: {
      name: "access-selector",
      type: "baota",
    },
    required: true,
  })
  accessId!: string;

  async onInstance() {}
  async execute(): Promise<void> {
    const { cert, accessId } = this;
    const access = await this.getAccess(accessId);
    const http = this.ctx.http;
    const client = new BaotaClient(access, http);

    const lockKey = `baota-lock-${accessId}`;
    await this.ctx.utils.locker.execute(lockKey, async () => {
      const res = await client.doRequest(
        "/config",
        "SavePanelSSL",
        {
          privateKey: cert.key,
          certPem: cert.crt,
        },
        {
          skipSslVerify: true,
        }
      );
      this.logger.info(res?.msg);
    });
  }
}
new BaotaDeployPanelCertPlugin();
