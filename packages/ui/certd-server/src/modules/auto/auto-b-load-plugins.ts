import { Autoload, Init, Inject, Scope, ScopeEnum } from "@midwayjs/core";
import { logger } from "@certd/basic";
import { PluginService } from "../plugin/service/plugin-service.js";

@Autoload()
@Scope(ScopeEnum.Request, { allowDowngrade: true })
export class AutoBLoadPlugins {
  @Inject()
  pluginService: PluginService;


  @Init()
  async init() {
    logger.info(`加载插件开始，加载模式:${process.env.certd_plugin_loadmode}`);
    if (process.env.certd_plugin_loadmode === "metadata") {
      await this.pluginService.registerFromLocal("./metadata")
    }else{
      await import("../../plugins/index.js")
    }
    // await import("../../plugins/index.js")
    await this.pluginService.registerFromDb()
    logger.info(`加载插件完成，加载模式:${process.env.certd_plugin_loadmode}`);

  }
}
