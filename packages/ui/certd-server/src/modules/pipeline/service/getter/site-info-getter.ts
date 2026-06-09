import { SysSettingsService, SysInstallInfo } from "@certd/lib-server";
import { Inject, Provide, Scope, ScopeEnum } from "@midwayjs/core";
import { SiteInfo, ISiteInfoGetter } from "@certd/plugin-lib";

@Provide("siteInfoGetter")
@Scope(ScopeEnum.Request, { allowDowngrade: true })
export class SiteInfoGetter implements ISiteInfoGetter {
  @Inject()
  sysSettingsService: SysSettingsService;

  async getSiteInfo(): Promise<SiteInfo> {
    const installInfo = await this.sysSettingsService.getSetting<SysInstallInfo>(SysInstallInfo);

    return {
      siteUrl: installInfo?.bindUrl || "",
    };
  }
}
