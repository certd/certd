import { Autoload, Init, Inject, Scope, ScopeEnum } from '@midwayjs/core';
import { getPlusInfo, isPlus, logger } from '@certd/pipeline';
import { SysInstallInfo, SysSettingsService } from '@certd/lib-server';
import { getVersion } from '../../utils/version.js';
import dayjs from 'dayjs';

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
    const plusInfo = getPlusInfo();
    if (isPlus()) {
      logger.info(`授权信息:${plusInfo.vipType},${dayjs(plusInfo.expireTime).format('YYYY-MM-DD')}`);
    }
    logger.info('服务启动完成');
    logger.info('=========================================');
  }
}
