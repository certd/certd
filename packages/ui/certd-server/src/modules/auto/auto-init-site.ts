import { Autoload, Init, Inject, Scope, ScopeEnum } from '@midwayjs/core';
import { logger } from '../../utils/logger.js';
import { UserService } from '../authority/service/user-service.js';
import { SysSettingsService } from '../system/service/sys-settings-service.js';
import { nanoid } from 'nanoid';
import { SysInstallInfo, SysLicenseInfo, SysPrivateSettings } from '../system/service/models.js';
import { verify } from '@certd/pipeline';
import crypto from 'crypto';
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
    //安装信息
    const installInfo: SysInstallInfo = await this.sysSettingsService.getSetting(SysInstallInfo);
    if (!installInfo.siteId) {
      installInfo.siteId = nanoid();
      await this.sysSettingsService.saveSetting(installInfo);
    }
    if (!installInfo.siteId) {
      installInfo.siteId = nanoid();
      await this.sysSettingsService.saveSetting(installInfo);
    }

    //private信息
    const privateInfo = await this.sysSettingsService.getSetting<SysPrivateSettings>(SysPrivateSettings);
    if (!privateInfo.jwtKey) {
      privateInfo.jwtKey = nanoid();
      await this.sysSettingsService.saveSetting(privateInfo);
    }

    if (!privateInfo.encryptSecret) {
      const secretKey = crypto.randomBytes(32);
      privateInfo.encryptSecret = secretKey.toString('base64');
      await this.sysSettingsService.saveSetting(privateInfo);
    }

    // 授权许可
    const licenseInfo: SysLicenseInfo = await this.sysSettingsService.getSetting(SysLicenseInfo);
    const req = {
      subjectId: installInfo.siteId,
      license: licenseInfo.license,
    };
    await verify(req);

    logger.info('初始化站点完成');
  }
}
