import { defineStore } from "pinia";
import { notification } from "ant-design-vue";
import * as basicApi from "./api.basic";
import { AppInfo, HeaderMenus, PlusInfo, SiteEnv, SiteInfo, SuiteSetting, SysInstallInfo, SysPublicSetting } from "./api.basic";
import { useUserStore } from "../user";
import { mitter } from "/@/utils/util.mitt";
import { env } from "/@/utils/util.env";
import { updatePreferences } from "/@/vben/preferences";
import { useTitle } from "@vueuse/core";
import { utils } from "/@/utils";
import { cloneDeep, merge } from "lodash-es";
import { useI18n } from "/src/locales";
import dayjs from "dayjs";
import { $t } from "/src/locales";
export interface SettingState {
  skipReset?: boolean; // 注销登录时，不清空此store的状态
  sysPublic?: SysPublicSetting;
  installInfo?: {
    siteId: string;
    installTime?: number;
    bindUserId?: number;
    bindUrl?: string;
    bindUrl2?: string;
    accountServerBaseUrl?: string;
    appKey?: string;
  };
  siteInfo: SiteInfo;
  plusInfo?: PlusInfo;
  siteEnv?: SiteEnv;
  headerMenus?: HeaderMenus;
  inited?: boolean;
  suiteSetting?: SuiteSetting;
  app: {
    version?: string;
    time?: number;
    deltaTime?: number;
  };
  productInfo: {
    notice?: string;
    plus: {
      name: string;
      price: number;
      price3: number;
      tooltip?: string;
      priceText?: string;
      discountText?: string;
    };
    comm: {
      name: string;
      price: number;
      price3: number;
      tooltip?: string;
      priceText?: string;
      discountText?: string;
    };
    app?: {
      minVersion?: string;
      minVersionTip?: string;
    };
  };
}

const defaultSiteInfo: SiteInfo = {
  title: env.TITLE || "Certd",
  slogan: env.SLOGAN || "让你的证书永不过期",
  logo: env.LOGO || "/static/images/logo/logo.svg",
  loginLogo: env.LOGIN_LOGO || "/static/images/logo/rect-block.svg",
  licenseTo: "",
  licenseToUrl: "",
};
export const useSettingStore = defineStore({
  id: "app.setting",
  state: (): SettingState => ({
    skipReset: true,
    plusInfo: {
      isPlus: false,
      vipType: "free",
      isComm: false,
    },
    sysPublic: {
      registerEnabled: false,
      managerOtherUserPipeline: false,
      icpNo: env.ICP_NO || "",
      homePageEnabled: true,
    },
    installInfo: {
      siteId: "",
      bindUserId: null,
      bindUrl: "",
      accountServerBaseUrl: "",
      appKey: "",
    },
    siteInfo: defaultSiteInfo,
    siteEnv: {
      agent: {
        enabled: undefined,
        contactText: "",
        contactLink: "",
      },
    },
    headerMenus: {
      menus: [],
    },
    suiteSetting: { enabled: false },
    inited: false,
    app: {
      version: "",
      time: 0,
      deltaTime: 0,
    },
    productInfo: {
      notice: "",
      plus: {
        name: "专业版",
        price: 29.9,
        price3: 89.9,
      },
      comm: {
        name: "商业版",
        price: 399,
        price3: 899,
      },
      app: {
        minVersion: "",
        minVersionTip: "",
      },
    },
  }),
  getters: {
    getSysPublic(): SysPublicSetting {
      return this.sysPublic;
    },
    getInstallInfo(): SysInstallInfo {
      return this.installInfo;
    },
    isPerpetual(): boolean {
      return this.plusInfo?.isPlus && this.plusInfo?.expireTime === -1;
    },
    isPlus(): boolean {
      return this.plusInfo?.isPlus && (this.plusInfo?.expireTime === -1 || this.plusInfo?.expireTime > new Date().getTime());
    },
    isComm(): boolean {
      return this.plusInfo?.isComm && (this.plusInfo?.expireTime === -1 || this.plusInfo?.expireTime > new Date().getTime());
    },
    isEnterprise(): boolean {
      return this.isPlus && this.sysPublic.adminMode === "enterprise";
    },
    isAgent(): boolean {
      return this.siteEnv?.agent?.enabled === true;
    },
    isCommOrAgent() {
      return this.isComm || this.isAgent;
    },
    expiresText() {
      if (this.plusInfo?.expireTime == null) {
        return "";
      }
      if (this.plusInfo?.expireTime === -1) {
        return "永久";
      }
      //@ts-ignore
      return dayjs(this.plusInfo?.expireTime).format("YYYY-MM-DD");
    },
    isForever() {
      //@ts-ignore
      return this.isPlus && this.plusInfo?.expireTime === -1;
    },
    vipLabel(): string {
      const { t } = useI18n();
      const vipLabelMap: any = {
        free: t("vip.label.free"),
        plus: t("vip.label.plus"),
        comm: t("vip.label.comm"),
      };
      return vipLabelMap[this.plusInfo?.vipType || "free"];
    },
    getHeaderMenus(): any[] {
      // @ts-ignore
      let menus = this.headerMenus?.menus || [];
      menus = cloneDeep(menus);
      return utils.tree.treeMap(menus, (menu: any) => {
        return {
          ...menu,
          name: menu.title,
          path: menu.path ?? "/" + menu.title,
          meta: {
            title: menu.title,
            icon: menu.icon,
            link: menu.path,
            order: 99999,
          },
        };
      });
    },
    isSuiteEnabled(): boolean {
      // @ts-ignore
      return this.suiteSetting?.enabled === true;
    },
  },
  actions: {
    checkPlus() {
      if (!this.isPlus) {
        notification.warn({
          message: $t("vip.needVipTip"),
        });
        mitter.emit("openVipModal");
        throw new Error($t("vip.needVipTip"));
      }
    },
    async loadSysSettings() {
      const allSettings = await basicApi.loadAllSettings();
      merge(this.sysPublic, allSettings.sysPublic || {});
      merge(this.installInfo, allSettings.installInfo || {});
      merge(this.siteEnv, allSettings.siteEnv || {});
      merge(this.plusInfo, allSettings.plusInfo || {});
      merge(this.headerMenus, allSettings.headerMenus || {});
      merge(this.suiteSetting, allSettings.suiteSetting || {});
      //@ts-ignore
      this.initSiteInfo(allSettings.siteInfo || {});
      this.initAppInfo(allSettings.app || {});
    },
    initAppInfo(appInfo: AppInfo) {
      this.app.time = appInfo.time;
      this.app.version = appInfo.version;
      this.app.deltaTime = new Date().getTime() - this.app.time;
    },
    initSiteInfo(siteInfo: SiteInfo) {
      //@ts-ignore
      if (this.isComm) {
        if (siteInfo.logo) {
          siteInfo.logo = `api/basic/file/download?key=${siteInfo.logo}`;
        }
        if (siteInfo.loginLogo) {
          siteInfo.loginLogo = `api/basic/file/download?key=${siteInfo.loginLogo}`;
        }
      }
      this.siteInfo = merge({}, defaultSiteInfo, siteInfo);

      if (this.siteInfo.logo) {
        updatePreferences({
          logo: {
            source: this.siteInfo.logo,
          },
        });
      }
      if (this.siteInfo.title) {
        updatePreferences({
          app: {
            name: this.siteInfo.title,
          },
        });
        useTitle(this.siteInfo.title);
      }
    },
    getBaseUrl() {
      let url = window.location.href;
      //只要hash前面的部分
      url = url.split("#")[0];
      return url;
    },
    async doBindUrl(key: string = "url") {
      const url = this.installInfo.bindUrl;
      const url2 = this.installInfo.bindUrl2;

      const thisUrl = this.getBaseUrl();
      const form = {
        url,
        url2,
        [key]: thisUrl,
      };
      await basicApi.bindUrl(form);
      await this.loadSysSettings();
    },
    async checkUrlBound() {
      const userStore = useUserStore();
      if (!userStore.isAdmin) {
        return;
      }
      const bindUrl = this.installInfo.bindUrl;
      const bindUrl2 = this.installInfo.bindUrl2;
      if (!bindUrl) {
        //绑定url
        await this.doBindUrl("url");
      } else {
        //检查当前url 是否与绑定的url一致
        const url = window.location.href;
        if (!url.startsWith(bindUrl) && !url.startsWith(bindUrl2)) {
          this.openBindUrlModal();
        }
      }
    },

    openBindUrlModal(opts: { closable?: boolean } = { closable: false }) {
      const event: any = { ModalRef: null };
      mitter.emit("getModal", event);
      const Modal = event.ModalRef;
      const bindUrl = this.installInfo.bindUrl;
      const bindUrl2 = this.installInfo.bindUrl2;

      const doBindRequest = async (key: string) => {
        await this.doBindUrl(key);
        if (modalRef) {
          modalRef.destroy();
        }
      };
      const { closable = false } = opts;
      let title = "URL地址未绑定，是否绑定此地址？";
      let okButtonText = "不，回到原来的地址";
      let okButtonDanger = false;
      let forceBack = true;
      if (closable) {
        title = "绑定URL";
        okButtonText = "确定";
        okButtonDanger = false;
        forceBack = false;
      }
      const modalRef: any = Modal.warning({
        title: title,
        width: 500,
        keyboard: false,
        closable,
        content: () => {
          return (
            <div class="p-4">
              <div class="flex items-center justify-between">
                <span>
                  绑定地址1：
                  <a-tag color="green">{bindUrl || "未占用"}</a-tag>
                </span>
                <a-button type="primary" onClick={() => doBindRequest("url")}>
                  绑定到地址1
                </a-button>
              </div>
              <div class="helper">各类通知里面会以地址1作为URL显示</div>
              <div class="flex items-center justify-between mt-3">
                <span>
                  绑定地址2：
                  <a-tag color="green">{bindUrl2 || "未占用"}</a-tag>
                </span>
                <a-button type="primary" onClick={() => doBindRequest("url2")}>
                  绑定到地址2
                </a-button>
              </div>
            </div>
          );
        },
        onOk: async () => {
          // await this.doBindUrl();
          if (forceBack) {
            window.location.href = bindUrl;
          }
        },
        okButtonProps: {
          danger: okButtonDanger,
        },
        okText: okButtonText,
        // cancelText: "不，回到原来的地址",
        // onOk: () => {
        //   window.location.href = bindUrl;
        // },
      });
    },
    async loadProductInfo() {
      try {
        const productInfo = await basicApi.getProductInfo();
        merge(this.productInfo, productInfo);
      } catch (e) {
        console.error(e);
      }
    },
    async init() {
      await this.loadSysSettings();
    },
    async initOnce() {
      if (this.inited) {
        return;
      }
      await this.init();
      this.loadProductInfo();
      this.inited = true;
    },
  },
});

mitter.on("app.login", async () => {
  await useSettingStore().init();
});
