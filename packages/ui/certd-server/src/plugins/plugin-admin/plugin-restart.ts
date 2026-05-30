import { AbstractTaskPlugin, IsTaskPlugin, pluginGroups, RunStrategy } from "@certd/pipeline";
import { httpsServer } from "../../modules/auto/https/server.js";

@IsTaskPlugin({
  name: "RestartCertd",
  title: "重启 Certd",
  icon: "mdi:restart",
  desc: "【仅管理员可用】 重启 certd的https服务，用于更新 Certd 的 ssl 证书",
  group: pluginGroups.admin.key,
  onlyAdmin: true,
  default: {
    strategy: {
      runStrategy: RunStrategy.SkipWhenSucceed,
    },
  },
})
export class RestartCertdPlugin extends AbstractTaskPlugin {
  async onInstance() {}
  async execute(): Promise<void> {
    this.checkAdmin();
    this.logger.info("Certd https server 将在 3 秒后重启");
    await this.ctx.utils.sleep(3000);
    await httpsServer.restart();
  }
}
new RestartCertdPlugin();
