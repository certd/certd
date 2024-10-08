import { Config, Init, Inject, Provide, Scope, ScopeEnum } from '@midwayjs/core';
import { AppKey, PlusRequestService, verify } from '@certd/pipeline';
import { logger } from '@certd/basic';
import { SysInstallInfo, SysLicenseInfo, SysSettingsService } from '../../settings/index.js';

@Provide()
@Scope(ScopeEnum.Singleton)
export class PlusService {
  @Inject()
  sysSettingsService: SysSettingsService;
  @Config('plus.server.baseUrls')
  plusServerBaseUrls: string[];

  plusRequestService: PlusRequestService;

  @Init()
  async init() {
    const installInfo: SysInstallInfo = await this.sysSettingsService.getSetting(SysInstallInfo);
    this.plusRequestService = new PlusRequestService({
      plusServerBaseUrls: this.plusServerBaseUrls,
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
    const verifyRes = await this.verify();
    if (!verifyRes.isPlus) {
      const message = verifyRes.message || '授权码校验失败';
      logger.error(message);
      throw new Error(message);
    }
  }
  async verify() {
    const licenseInfo: SysLicenseInfo = await this.sysSettingsService.getSetting(SysLicenseInfo);
    const installInfo: SysInstallInfo = await this.sysSettingsService.getSetting(SysInstallInfo);

    return await verify({
      subjectId: installInfo.siteId,
      license: licenseInfo.license,
      plusRequestService: this.plusRequestService,
      bindUrl: installInfo?.bindUrl,
    });
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
