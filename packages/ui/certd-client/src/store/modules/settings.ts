import { defineStore } from "pinia";
import { Modal, theme } from "ant-design-vue";
import _ from "lodash-es";
// @ts-ignore
import { LocalStorage } from "/src/utils/util.storage";

import * as basicApi from "/@/api/modules/api.basic";
import { SysInstallInfo, SysPublicSetting } from "/@/api/modules/api.basic";
import { useUserStore } from "/@/store/modules/user";
import { mitter } from "/@/utils/util.mitt";

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
    installTime?: number;
    bindUserId?: number;
    bindUrl?: string;
    accountServerBaseUrl?: string;
    appKey?: string;
  };
  siteInfo?: {
    title: string;
    slogan: string;
    logo: string;
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
      managerOtherUserPipeline: false,
      icpNo: ""
    },
    installInfo: {
      siteId: "",
      bindUserId: null,
      bindUrl: "",
      accountServerBaseUrl: "",
      appKey: ""
    },
    siteInfo: {
      title: "Certd",
      slogan: "让你的证书永不过期",
      logo: ""
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

      const siteInfo = await basicApi.getSiteInfo();
      _.merge(this.siteInfo, siteInfo);

      await this.loadInstallInfo();

      await this.checkUrlBound();
    },
    async loadInstallInfo() {
      const installInfo = await basicApi.getInstallInfo();
      _.merge(this.installInfo, installInfo);
    },
    async checkUrlBound() {
      const userStore = useUserStore();
      if (!userStore.isAdmin || !userStore.isPlus) {
        return;
      }

      const bindUrl = this.installInfo.bindUrl;

      function getBaseUrl() {
        let url = window.location.href;
        //只要hash前面的部分
        url = url.split("#")[0];
        return url;
      }

      const doBindUrl = async (url: string) => {
        await basicApi.bindUrl({ url });
        await this.loadInstallInfo();
      };
      const baseUrl = getBaseUrl();
      if (!bindUrl) {
        //绑定url
        await doBindUrl(baseUrl);
      } else {
        //检查当前url 是否与绑定的url一致
        const url = window.location.href;
        if (!url.startsWith(bindUrl)) {
          Modal.confirm({
            title: "URL地址有变化",
            content: "以后都用这个新地址访问本系统吗？",
            onOk: async () => {
              await doBindUrl(baseUrl);
            },
            okText: "是的，继续",
            cancelText: "不是，回到原来的地址",
            onCancel: () => {
              window.location.href = bindUrl;
            }
          });
        }
      }
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

mitter.on("app.login", async () => {
  await useSettingStore().init();
});
