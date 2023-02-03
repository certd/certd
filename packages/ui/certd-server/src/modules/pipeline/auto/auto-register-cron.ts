import { Autoload, Init, Inject, Scope, ScopeEnum } from "@midwayjs/decorator";
import { PipelineService } from '../service/pipeline-service';
import { logger } from '../../../utils/logger';

@Autoload()
@Scope(ScopeEnum.Singleton)
export class AutoRegisterCron {
  @Inject()
  pipelineService: PipelineService;

  // @Inject()
  // echoPlugin: EchoPlugin;

  @Init()
  async init() {
    logger.info('加载定时trigger开始');
    await this.pipelineService.onStartup();
    // logger.info(this.echoPlugin, this.echoPlugin.test);
    // logger.info('加载定时trigger完成');
    //
    // const meta = getClassMetadata(CLASS_KEY, this.echoPlugin);
    // console.log('meta', meta);
    // const metas = listPropertyDataFromClass(CLASS_KEY, this.echoPlugin);
    // console.log('metas', metas);
  }
}
