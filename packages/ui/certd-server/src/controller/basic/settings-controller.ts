import { Config, Controller, Get, Inject, Provide } from "@midwayjs/core";
import {
  BaseController,
  Constants,
  SysHeaderMenus,
  SysInstallInfo,
  SysPublicSettings,
  SysSettingsService,
  SysSiteEnv,
  SysSiteInfo,
  SysSuiteSetting
} from "@certd/lib-server";
import { AppKey, getPlusInfo, isComm } from "@certd/plus-core";
import { cloneDeep } from "lodash-es";
import { getVersion } from "../../utils/version.js";
import { http } from "@certd/basic";

/**
 */
@Provide()
@Controller("/api/basic/settings")
export class BasicSettingsController extends BaseController {
  @Inject()
  sysSettingsService: SysSettingsService;
  @Config("account.server.baseUrl")
  accountServerBaseUrl: any;

  @Config("agent")
  agentConfig: SysSiteEnv["agent"];

  public async getSysPublic() {
    return await this.sysSettingsService.getSetting(SysPublicSettings);
  }

  public async getInstallInfo() {
    const settings: SysInstallInfo = await this.sysSettingsService.getSetting(SysInstallInfo);
    settings.accountServerBaseUrl = this.accountServerBaseUrl;
    settings.appKey = AppKey;
    return settings;
  }

  public async getSiteInfo() {
    return await this.sysSettingsService.getSetting(SysSiteInfo);
  }

  public async getHeaderMenus() {
    return await this.sysSettingsService.getSetting(SysHeaderMenus);
  }

  public async getSuiteSetting() {
    if (!isComm()) {
      return { enabled: false };
    }
    const setting = await this.sysSettingsService.getSetting<SysSuiteSetting>(SysSuiteSetting);
    return {
      enabled: setting.enabled
    };
  }

  public async getSiteEnv() {
    const env: SysSiteEnv = {
      agent: this.agentConfig
    };
    return env;
  }

  async plusInfo() {
    const res = getPlusInfo();
    const copy = cloneDeep(res);
    delete copy.secret;
    return copy;
  }

  @Get("/productInfo", { description: Constants.per.guest })
  async getProductInfo() {
    const info = await http.request({
      url: "https://app.handfree.work/certd/info.json"
    });
    return this.ok(info);

  }

  @Get("/all", { description: Constants.per.guest })
  async getAllSettings() {
    const sysPublic = await this.getSysPublic();
    const installInfo = await this.getInstallInfo();
    let siteInfo = {};
    if (isComm()) {
      siteInfo = await this.getSiteInfo();
    }
    const siteEnv = await this.getSiteEnv();
    const plusInfo = await this.plusInfo();
    const headerMenus = await this.getHeaderMenus();
    const suiteSetting = await this.getSuiteSetting();
    const version = await getVersion();
    return this.ok({
      sysPublic,
      installInfo,
      siteInfo,
      siteEnv,
      plusInfo,
      headerMenus,
      suiteSetting,
      app: {
        time: new Date().getTime(),
        version
      },
    });
  }
}
