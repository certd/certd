import { Config, Init, Inject, Provide, Scope, ScopeEnum } from '@midwayjs/core';
import { SysSettingsService } from '../../system/service/sys-settings-service.js';
import { SysInstallInfo, SysLicenseInfo } from '../../system/service/models.js';
import { AppKey, http, PlusRequestService, verify } from '@certd/pipeline';
import { logger } from '../../../utils/logger.js';

@Provide()
@Scope(ScopeEnum.Singleton)
export class PlusService {
  @Inject()
  sysSettingsService: SysSettingsService;
  @Config('plus.server.baseUrl')
  plusServerBaseUrl;

  plusRequestService: PlusRequestService;

  @Init()
  async init() {
    const installInfo: SysInstallInfo = await this.sysSettingsService.getSetting(SysInstallInfo);
    this.plusRequestService = new PlusRequestService({
      plusServerBaseUrl: this.plusServerBaseUrl,
      http: http,
      logger,
      subjectId: installInfo.siteId,
    });
  }

  async requestWithoutSign(config: any) {
    return await this.plusRequestService.requestWithoutSign(config);
  }
  async request(config: any) {
    return await this.plusRequestService.request(config);
  }

  async active(formData: { code: any; appKey: string; subjectId: string }) {
    return await this.plusRequestService.requestWithoutSign({
      url: '/activation/active',
      method: 'post',
      data: formData,
    });
  }

  async updateLicense(license: string) {
    let licenseInfo: SysLicenseInfo = await this.sysSettingsService.getSetting(SysLicenseInfo);
    if (!licenseInfo) {
      licenseInfo = new SysLicenseInfo();
    }
    licenseInfo.license = license;
    await this.sysSettingsService.saveSetting(licenseInfo);
    await this.verify();
  }
  async verify() {
    const licenseInfo: SysLicenseInfo = await this.sysSettingsService.getSetting(SysLicenseInfo);
    const installInfo: SysInstallInfo = await this.sysSettingsService.getSetting(SysInstallInfo);

    const verifyRes = await verify({
      subjectId: installInfo.siteId,
      license: licenseInfo.license,
      plusRequestService: this.plusRequestService,
      bindUrl: installInfo?.bindUrl,
    });

    if (!verifyRes.isPlus) {
      const message = verifyRes.message || '授权码校验失败';
      logger.error(message);
      throw new Error(message);
    }
  }

  async bindUrl(subjectId: string, url: string) {
    return await this.plusRequestService.request({
      url: '/activation/subject/urlBind',
      data: {
        subjectId,
        appKey: AppKey,
        url,
      },
    });
  }
}
