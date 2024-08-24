import { defineStore } from "pinia";
import { theme } from "ant-design-vue";
import _ from "lodash-es";
// @ts-ignore
import { LocalStorage } from "/src/utils/util.storage";

import * as basicApi from "/@/api/modules/api.basic";
import { SysInstallInfo, SysPublicSetting } from "/@/api/modules/api.basic";

export type ThemeToken = {
  token: {
    colorPrimary?: string;
  };
  algorithm: any;
};
export type ThemeConfig = {
  colorPrimary: string;
  mode: string;
};
export interface SettingState {
  themeConfig?: ThemeConfig;
  themeToken: ThemeToken;
  sysPublic?: SysPublicSetting;
  installInfo?: {
    siteId: string;
  };
}

const defaultThemeConfig = {
  colorPrimary: "#1890ff",
  mode: "light"
};
const SETTING_THEME_KEY = "SETTING_THEME";
export const useSettingStore = defineStore({
  id: "app.setting",
  state: (): SettingState => ({
    themeConfig: null,
    themeToken: {
      token: {},
      algorithm: theme.defaultAlgorithm
    },
    sysPublic: {
      registerEnabled: false,
      managerOtherUserPipeline: false
    },
    installInfo: {
      siteId: ""
    }
  }),
  getters: {
    getThemeConfig(): any {
      return this.themeConfig || _.merge({}, defaultThemeConfig, LocalStorage.get(SETTING_THEME_KEY) || {});
    },
    getSysPublic(): SysPublicSetting {
      return this.sysPublic;
    },
    getInstallInfo(): SysInstallInfo {
      return this.installInfo;
    }
  },
  actions: {
    async loadSysSettings() {
      const settings = await basicApi.getSysPublicSettings();
      _.merge(this.sysPublic, settings);

      const installInfo = await basicApi.getInstallInfo();
      _.merge(this.installInfo, installInfo);
    },
    persistThemeConfig() {
      LocalStorage.set(SETTING_THEME_KEY, this.getThemeConfig);
    },
    async setThemeConfig(themeConfig?: ThemeConfig) {
      this.themeConfig = _.merge({}, this.themeConfig, themeConfig);

      this.persistThemeConfig();
      this.setPrimaryColor(this.themeConfig.colorPrimary);
      this.setDarkMode(this.themeConfig.mode);
    },
    setPrimaryColor(color: any) {
      this.themeConfig.colorPrimary = color;
      _.set(this.themeToken, "token.colorPrimary", color);
      this.persistThemeConfig();
    },
    setDarkMode(mode: string) {
      this.themeConfig.mode = mode;
      if (mode === "dark") {
        this.themeToken.algorithm = theme.darkAlgorithm;
        // const defaultSeed = theme.defaultSeed;
        // const mapToken = theme.darkAlgorithm(defaultSeed);
        // less.modifyVars(mapToken);
        // less.modifyVars({
        //   "@colorPrimaryBg": "#111a2c",
        //   colorPrimaryBg: "#111a2c"
        // });
        // less.refreshStyles();
      } else {
        this.themeToken.algorithm = theme.defaultAlgorithm;

        // const defaultSeed = theme.defaultSeed;
        // const mapToken = theme.defaultAlgorithm(defaultSeed);
        // less.modifyVars(mapToken);
      }
      this.persistThemeConfig();
    },
    async init() {
      await this.setThemeConfig(this.getThemeConfig);
      await this.loadSysSettings();
    }
  }
});
