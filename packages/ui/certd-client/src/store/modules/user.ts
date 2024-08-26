import { defineStore } from "pinia";
import router from "../../router";
// @ts-ignore
import { LocalStorage } from "/src/utils/util.storage";
// @ts-ignore
import * as UserApi from "/src/api/modules/api.user";
import { RegisterReq } from "/src/api/modules/api.user";
// @ts-ignore
import { LoginReq, UserInfoRes } from "/@/api/modules/api.user";
import { Modal, notification } from "ant-design-vue";
import { useI18n } from "vue-i18n";

import { mitter } from "/src/utils/util.mitt";

interface UserState {
  userInfo: Nullable<UserInfoRes>;
  token?: string;
  plusInfo?: PlusInfo;
  inited: boolean;
}

interface PlusInfo {
  vipType: string;
  expireTime: number;
  isPlus: boolean;
}

const USER_INFO_KEY = "USER_INFO";
const TOKEN_KEY = "TOKEN";
export const useUserStore = defineStore({
  id: "app.user",
  state: (): UserState => ({
    // user info
    userInfo: null,
    // token
    token: undefined,
    // plus
    plusInfo: null,
    inited: false
  }),
  getters: {
    getUserInfo(): UserInfoRes {
      return this.userInfo || LocalStorage.get(USER_INFO_KEY) || {};
    },
    getToken(): string {
      return this.token || LocalStorage.get(TOKEN_KEY);
    },
    isAdmin(): boolean {
      return this.getUserInfo?.id === 1;
    },
    isPlus(): boolean {
      return this.plusInfo?.isPlus && this.plusInfo?.expireTime > new Date().getTime();
    }
  },
  actions: {
    setToken(info: string, expire: number) {
      this.token = info;
      LocalStorage.set(TOKEN_KEY, this.token, expire);
    },
    setUserInfo(info: UserInfoRes) {
      this.userInfo = info;
      LocalStorage.set(USER_INFO_KEY, info);
    },
    resetState() {
      this.userInfo = null;
      this.token = "";
      LocalStorage.remove(TOKEN_KEY);
      LocalStorage.remove(USER_INFO_KEY);
    },

    async register(user: RegisterReq) {
      await UserApi.register(user);
      notification.success({
        message: "注册成功，请登录"
      });
      await router.replace("/login");
    },
    /**
     * @description: login
     */
    async login(params: LoginReq): Promise<any> {
      try {
        const data = await UserApi.login(params);
        const { token, expire } = data;

        // save token
        this.setToken(token, expire);
        // get user info
        return await this.onLoginSuccess(data);
      } catch (error) {
        return null;
      }
    },
    async getUserInfoAction(): Promise<UserInfoRes> {
      const userInfo = await UserApi.mine();
      this.setUserInfo(userInfo);
      return userInfo;
    },

    async onLoginSuccess(loginData: any) {
      await this.getUserInfoAction();
      await this.loadPlusInfo();
      const userInfo = await this.getUserInfoAction();
      mitter.emit("app.login", { userInfo, token: loginData, plusInfo: this.plusInfo });
      await router.replace("/");
      return userInfo;
    },

    async loadPlusInfo() {
      this.plusInfo = await UserApi.getPlusInfo();
    },
    /**
     * @description: logout
     */
    logout(goLogin = true) {
      this.resetState();
      goLogin && router.push("/login");
      mitter.emit("app.logout");
    },

    /**
     * @description: Confirm before logging out
     */
    confirmLoginOut() {
      const { t } = useI18n();
      Modal.config({
        iconType: "warning",
        title: t("app.login.logoutTip"),
        content: t("app.login.logoutMessage"),
        onOk: async () => {
          await this.logout(true);
        }
      });
    },
    async init() {
      if (this.inited) {
        return;
      }
      if (this.getToken) {
        await this.loadPlusInfo();
      }
      this.inited = true;
    },
    async reInit() {
      this.inited = false;
      await this.init();
    }
  }
});
