import { defineStore } from "pinia";
import { Modal, notification, theme } from "ant-design-vue";
import _ from "lodash-es";
// @ts-ignore
import { LocalStorage } from "/src/utils/util.storage";

import * as basicApi from "/@/api/modules/api.basic";
import { SysInstallInfo, SysPublicSetting } from "/@/api/modules/api.basic";
import { useUserStore } from "/@/store/modules/user";
import { mitter } from "/@/utils/util.mitt";
import { env } from "/@/utils/util.env";
import { toRef } from "vue";

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
  siteInfo: SiteInfo;
  plusInfo?: PlusInfo;
}

export type SiteInfo = {
  title: string;
  slogan: string;
  logo: string;
  loginLogo: string;
  warningOff: boolean;
  icpNo: string;
  licenseTo?: string;
  licenseToUrl?: string;
};

interface PlusInfo {
  vipType?: string;
  expireTime?: number;
  isPlus: boolean;
  isComm?: boolean;
}

const defaultThemeConfig = {
  colorPrimary: "#1890ff",
  mode: "light"
};
const SETTING_THEME_KEY = "SETTING_THEME";
const defaultSiteInfo = {
  title: env.TITLE || "Certd",
  slogan: env.SLOGAN || "让你的证书永不过期",
  logo: env.LOGO || "/static/images/logo/logo.svg",
  loginLogo: env.LOGIN_LOGO || "/static/images/logo/rect-block.svg",
  warningOff: false,
  icpNo: env.ICP_NO,
  licenseTo: "",
  licenseToUrl: ""
};
export const useSettingStore = defineStore({
  id: "app.setting",
  state: (): SettingState => ({
    themeConfig: null,
    themeToken: {
      token: {},
      algorithm: theme.defaultAlgorithm
    },
    plusInfo: {
      isPlus: false,
      vipType: "free"
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
    siteInfo: defaultSiteInfo
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
    },
    isPlus(): boolean {
      return this.plusInfo?.isPlus && this.plusInfo?.expireTime > new Date().getTime();
    },
    isComm(): boolean {
      return this.plusInfo?.isComm && this.plusInfo?.expireTime > new Date().getTime();
    },
    vipLabel(): string {
      const vipLabelMap: any = {
        free: "免费版",
        plus: "专业版",
        comm: "商业版"
      };
      return vipLabelMap[this.plusInfo?.vipType || "free"];
    }
  },
  actions: {
    checkPlus() {
      if (!this.isPlus) {
        notification.warn({
          message: "此为专业版功能，请先升级到专业版"
        });
        throw new Error("此为专业版功能，请升级到专业版");
      }
    },
    async loadSysSettings() {
      const settings = await basicApi.getSysPublicSettings();
      _.merge(this.sysPublic, settings);

      await this.loadInstallInfo();

      await this.loadPlusInfo();

      if (this.isComm) {
        await this.loadSiteInfo();
      }

      await this.checkUrlBound();
    },
    async loadInstallInfo() {
      const installInfo = await basicApi.getInstallInfo();
      _.merge(this.installInfo, installInfo);
    },
    async loadPlusInfo() {
      this.plusInfo = await basicApi.getPlusInfo();
    },
    async loadSiteInfo() {
      const isComm = this.isComm;
      let siteInfo = {};
      if (isComm) {
        siteInfo = await basicApi.getSiteInfo();
        if (siteInfo.logo) {
          siteInfo.logo = `/api/basic/file/download?key=${siteInfo.logo}`;
        }
        if (siteInfo.loginLogo) {
          siteInfo.loginLogo = `/api/basic/file/download?key=${siteInfo.loginLogo}`;
        }
      }

      const sysPublic = this.getSysPublic;
      if (sysPublic.icpNo) {
        siteInfo.icpNo = sysPublic.icpNo;
      }
      this.siteInfo = _.merge({}, defaultSiteInfo, siteInfo);
    },
    async checkUrlBound() {
      const userStore = useUserStore();
      const settingStore = useSettingStore();
      if (!userStore.isAdmin || !settingStore.isPlus) {
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
