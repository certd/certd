import { Config, Inject, Provide, Scope, ScopeEnum } from '@midwayjs/core';
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

  async getPlusRequestService() {
    const installInfo: SysInstallInfo = await this.sysSettingsService.getSetting(SysInstallInfo);
    return new PlusRequestService({
      plusServerBaseUrls: this.plusServerBaseUrls,
      subjectId: installInfo.siteId,
    });
  }

  async requestWithoutSign(config: any) {
    const plusRequestService = await this.getPlusRequestService();
    return await plusRequestService.requestWithoutSign(config);
  }
  async request(config: any) {
    const plusRequestService = await this.getPlusRequestService();
    return await plusRequestService.request(config);
  }

  async active(formData: { code: any; appKey: string; subjectId: string }) {
    const plusRequestService = await this.getPlusRequestService();
    return await plusRequestService.requestWithoutSign({
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

    const plusRequestService = await this.getPlusRequestService();
    return await verify({
      subjectId: installInfo.siteId,
      license: licenseInfo.license,
      plusRequestService: plusRequestService,
      bindUrl: installInfo?.bindUrl,
    });
  }

  async bindUrl(subjectId: string, url: string) {
    const plusRequestService = await this.getPlusRequestService();
    return await plusRequestService.request({
      url: '/activation/subject/urlBind',
      data: {
        subjectId,
        appKey: AppKey,
        url,
      },
    });
  }
}
