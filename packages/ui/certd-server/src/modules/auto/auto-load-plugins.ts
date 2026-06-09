import { Inject, Provide, Scope, ScopeEnum } from "@midwayjs/core";
import { logger } from "@certd/basic";
import { PluginService } from "../plugin/service/plugin-service.js";
import { registerPaymentProviders } from "../suite/payments/index.js";

@Provide()
@Scope(ScopeEnum.Request, { allowDowngrade: true })
export class AutoLoadPlugins {
  @Inject()
  pluginService: PluginService;

  async init() {
    logger.info(`加载插件开始，加载模式:${process.env.certd_plugin_loadmode}`);
    if (process.env.certd_plugin_loadmode === "metadata") {
      await this.pluginService.registerFromLocal("./metadata");
    } else {
      // await import("../../plugins/index.js")
      const fs = await import("fs");
      const list = fs.readdirSync("./dist/plugins");
      console.log("list", list);
      for (const file of list) {
        if (!file.includes(".")) {
          logger.info(`加载插件文件:${file}`);
          await import(`../../plugins/${file}/index.js`);
        }
      }
    }
    // await import("../../plugins/index.js")
    await this.pluginService.registerFromDb();

    await registerPaymentProviders();
    logger.info(`加载插件完成，加载模式:${process.env.certd_plugin_loadmode}`);
  }
}
