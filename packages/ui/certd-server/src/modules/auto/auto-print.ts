import { App, Config, Inject, Provide, Scope, ScopeEnum } from "@midwayjs/core";
import { getPlusInfo, isPlus } from "@certd/plus-core";
import { isDev, logger } from "@certd/basic";

import { SysInstallInfo, SysSettingsService } from "@certd/lib-server";
import { getVersion } from "../../utils/version.js";
import dayjs from "dayjs";
import { Application } from "@midwayjs/koa";
import { httpsServer, HttpsServerOptions } from "./https/server.js";
import { UserService } from "../sys/authority/service/user-service.js";
import { UserSettingsService } from "../mine/service/user-settings-service.js";
import { startProxyServer } from "./proxy/server.js";

@Provide()
@Scope(ScopeEnum.Request, { allowDowngrade: true })
export class AutoPrint {
  @Inject()
  sysSettingsService: SysSettingsService;

  @App()
  app: Application;

  @Config("https")
  httpsConfig: HttpsServerOptions;
  @Config("koa")
  koaConfig: any;

  @Inject()
  userService: UserService;

  @Inject()
  userSettingsService: UserSettingsService;

  @Config("system.resetAdminPasswd")
  private resetAdminPasswd: boolean;

  async init() {
    //监听https
    this.startHttpsServer();
    // this.startProxyServer();
    logger.info("ENV:", process.env.NODE_ENV);
    if (isDev()) {
      this.startHeapLog();
    }
    const installInfo: SysInstallInfo = await this.sysSettingsService.getSetting(SysInstallInfo);
    logger.info("=========================================");
    logger.info("当前站点ID:", installInfo.siteId);
    const version = await getVersion();
    logger.info(`当前版本:${version}`);
    const plusInfo = getPlusInfo();
    if (isPlus()) {
      logger.info(`授权信息:${plusInfo.vipType},${plusInfo.expireTime === -1 ? "永久" : dayjs(plusInfo.expireTime).format("YYYY-MM-DD")}`);
    }
    logger.info("Certd已启动");
    logger.info("=========================================");
    await this.resetPasswd();
  }

  async resetPasswd() {
    if (this.resetAdminPasswd === true) {
      logger.info("开始重置1号管理员用户的密码");
      const newPasswd = "123456";
      await this.userService.resetPassword(1, newPasswd);
      await this.userService.updateStatus(1, 1);
      await this.userSettingsService.deleteWhere({
        userId: 1,
        key: "user.two.factor",
      });
      const publicSettings = await this.sysSettingsService.getPublicSettings();
      publicSettings.captchaEnabled = false;
      await this.sysSettingsService.savePublicSettings(publicSettings);

      const user = await this.userService.info(1);
      logger.info(`重置1号管理员用户的密码完成，2FA设置已删除，验证码登录已禁用，用户名：${user.username},新密码：${newPasswd}，请在登录进去之后尽快修改密码`);
    }
  }

  startHeapLog() {
    function format(bytes: any) {
      return (bytes / 1024 / 1024).toFixed(2) + " MB";
    }
    function printHeapLog() {
      const mu = process.memoryUsage();
      logger.info(`rss:${format(mu.rss)},heapUsed: ${format(mu.heapUsed)},heapTotal: ${format(mu.heapTotal)},external: ${format(mu.external)},arrayBuffers: ${format(mu.arrayBuffers)}`);
    }
    setInterval(printHeapLog, 20000);
    printHeapLog();
  }

  startHttpsServer() {
    if (!this.httpsConfig.enabled) {
      logger.info("Https server is not enabled");
      return;
    }
    httpsServer.start({
      ...this.httpsConfig,
      app: this.app,
      hostname: this.httpsConfig.hostname || this.koaConfig.hostname,
    });
  }

  startProxyServer() {
    startProxyServer({ port: 7003 });
  }
}
