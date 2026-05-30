import { Inject, Provide, Scope, ScopeEnum } from "@midwayjs/core";
import { SiteHidden, SysSafeSetting, SysSettingsService } from "@certd/lib-server";
import fs from "fs";
import { logger, utils } from "@certd/basic";
import { cloneDeep, merge } from "lodash-es";

export class HiddenStatus {
  isHidden = false;
  lastRequestTime = 0;
  intervalId: any = null;

  hasUnHiddenFile() {
    if (fs.existsSync(`./data/.unhidden`)) {
      fs.unlinkSync(`./data/.unhidden`);
      return true;
    }
    return false;
  }

  updateRequestTime() {
    this.lastRequestTime = Date.now();
  }

  startCheck(autoHiddenTimes = 5) {
    this.stopCheck();
    this.intervalId = setInterval(() => {
      //默认5分钟后自动隐藏
      if (!this.isHidden && Date.now() - this.lastRequestTime > 1000 * 60 * autoHiddenTimes) {
        this.isHidden = true;
      }
    }, 1000 * 60);
  }

  stopCheck() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }
}

export const hiddenStatus = new HiddenStatus();

@Provide("safeService")
@Scope(ScopeEnum.Request, { allowDowngrade: true })
export class SafeService {
  @Inject()
  sysSettingsService: SysSettingsService;

  async reloadHiddenStatus(immediate = false) {
    const hidden = await this.getHiddenSetting();
    if (hidden.enabled) {
      logger.info("启动站点隐藏");
      hiddenStatus.isHidden = immediate;
      const autoHiddenTimes = hidden.autoHiddenTimes || 5;
      hiddenStatus.startCheck(autoHiddenTimes);
    } else {
      logger.info("当前站点隐藏已关闭");
      hiddenStatus.isHidden = false;
      hiddenStatus.stopCheck();
    }
  }

  async getHiddenSetting(): Promise<SiteHidden> {
    const safeSetting = await this.getSafeSetting();
    return safeSetting.hidden || { enabled: false };
  }

  async getSafeSetting() {
    return await this.sysSettingsService.getSetting<SysSafeSetting>(SysSafeSetting);
  }

  async hiddenImmediately() {
    return (hiddenStatus.isHidden = true);
  }

  async saveSafeSetting(body: SysSafeSetting) {
    // 更新hidden配置
    if (body.hidden.openPassword) {
      body.hidden.openPassword = utils.hash.md5(body.hidden.openPassword);
    }
    const blankSetting = new SysSafeSetting();
    const setting = await this.getSafeSetting();
    const newSetting = merge(blankSetting, cloneDeep(setting), body);
    if (newSetting.hidden?.enabled && !newSetting.hidden?.openPassword) {
      throw new Error("首次设置需要填写解锁密码");
    }

    if (isNaN(newSetting.hidden.autoHiddenTimes) || newSetting.hidden.autoHiddenTimes < 1) {
      newSetting.hidden.autoHiddenTimes = 1;
    }

    await this.sysSettingsService.saveSetting(newSetting);

    await this.reloadHiddenStatus(false);
  }
}
