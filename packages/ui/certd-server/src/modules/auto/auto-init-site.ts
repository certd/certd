import { Autoload, Init, Inject, Scope, ScopeEnum } from '@midwayjs/core';
import { logger } from '../../utils/logger.js';
import { UserService } from '../authority/service/user-service.js';
import { SysSettingsService } from '../system/service/sys-settings-service.js';
import { nanoid } from 'nanoid';
import { SysInstallInfo } from '../system/service/models.js';

export type InstallInfo = {
  installTime: number;
  instanceId?: string;
};

@Autoload()
@Scope(ScopeEnum.Singleton)
export class AutoInitSite {
  @Inject()
  userService: UserService;

  @Inject()
  sysSettingsService: SysSettingsService;

  @Init()
  async init() {
    logger.info('初始化站点开始');
    const installInfo: SysInstallInfo = await this.sysSettingsService.getSetting(SysInstallInfo);
    if (!installInfo.siteId) {
      installInfo.siteId = nanoid();
      await this.sysSettingsService.saveSetting(installInfo);
    }
    if (!installInfo.siteId) {
      installInfo.siteId = nanoid();
      await this.sysSettingsService.saveSetting(installInfo);
    }

    logger.info('初始化站点完成');
  }
}
