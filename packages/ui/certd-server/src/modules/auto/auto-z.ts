import { Autoload, Init, Inject, Scope, ScopeEnum } from '@midwayjs/core';
import { logger } from '@certd/pipeline';
import { SysInstallInfo, SysSettingsService } from '@certd/lib-server';
import { getVersion } from '../../utils/version.js';

@Autoload()
@Scope(ScopeEnum.Singleton)
export class AutoZPrint {
  @Inject()
  sysSettingsService: SysSettingsService;

  @Init()
  async init() {
    const installInfo: SysInstallInfo = await this.sysSettingsService.getSetting(SysInstallInfo);
    logger.info('=========================================');
    logger.info('当前站点ID:', installInfo.siteId);
    const version = await getVersion();
    logger.info(`当前版本:${version}`);
    logger.info('服务启动完成');
    logger.info('=========================================');
  }
}
