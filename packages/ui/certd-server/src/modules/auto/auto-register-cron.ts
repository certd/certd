import { Autoload, Config, Init, Inject, Scope, ScopeEnum } from '@midwayjs/core';
import { PipelineService } from '../pipeline/service/pipeline-service.js';
import { logger } from '../../utils/logger.js';

@Autoload()
@Scope(ScopeEnum.Singleton)
export class AutoRegisterCron {
  @Inject()
  pipelineService: PipelineService;

  @Config('cron.onlyAdminUser')
  private onlyAdminUser: boolean;

  // @Inject()
  // echoPlugin: EchoPlugin;
  @Config('cron.immediateTriggerOnce')
  private immediateTriggerOnce = false;

  @Init()
  async init() {
    logger.info('加载定时trigger开始');
    await this.pipelineService.onStartup(this.immediateTriggerOnce, this.onlyAdminUser);
    // logger.info(this.echoPlugin, this.echoPlugin.test);
    // logger.info('加载定时trigger完成');
    //
    // const meta = getClassMetadata(CLASS_KEY, this.echoPlugin);
    // console.log('meta', meta);
    // const metas = listPropertyDataFromClass(CLASS_KEY, this.echoPlugin);
    // console.log('metas', metas);
  }
}
