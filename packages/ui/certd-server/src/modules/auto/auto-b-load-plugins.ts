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
    logger.info('加载插件开始');
    await this.pluginService.registerFromLocal("./metadata")
    // await import("../../plugins/index.js")
    await this.pluginService.registerFromDb()
    logger.info('加载插件完成');

  }
}
