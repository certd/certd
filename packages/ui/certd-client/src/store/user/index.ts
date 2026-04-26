import { defineStore } from "pinia";
import router from "../../router";
// @ts-ignore
import { LocalStorage } from "/src/utils/util.storage";
// @ts-ignore
import * as UserApi from "./api.user";
import { ForgotPasswordReq, RegisterReq, SmsLoginReq } from "./api.user";
// @ts-ignore
import { LoginReq, UserInfoRes } from "/@/store/user/api.user";
import { message, Modal, notification } from "ant-design-vue";
import { useI18n } from "vue-i18n";

import { mitter } from "/src/utils/util.mitt";
import { resetAllStores, useAccessStore } from "/@/vben/stores";

import { useUserStore as vbenUserStore } from "/@/vben/stores/modules/user";
import { request } from "/@/api/service";

interface UserState {
  userInfo: Nullable<UserInfoRes>;
  token?: string;
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
  }),
  getters: {
    getUserInfo(): UserInfoRes {
      return this.userInfo || LocalStorage.get(USER_INFO_KEY) || {};
    },
    getToken(): string {
      return this.token || LocalStorage.get(TOKEN_KEY);
    },
    isAdmin(): boolean {
      return this.getUserInfo.roleIds?.includes(1) || this.getUserInfo.id === 1;
    },
  },
  actions: {
    setToken(token: string, expire: number) {
      this.token = token;
      const accessStore = useAccessStore();
      accessStore.setAccessToken(token);
      LocalStorage.set(TOKEN_KEY, this.token, expire);
    },
    setUserInfo(info: UserInfoRes) {
      this.userInfo = info;
      const userStore = vbenUserStore();
      userStore.setUserInfo(info as any);
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
        message: "注册成功，请登录",
      });
      await router.replace("/login");
    },
    async forgotPassword(params: ForgotPasswordReq): Promise<any> {
      await UserApi.forgotPassword(params);
      notification.success({
        message: "密码已重置，请登录",
      });
      await router.replace("/login");
    },
    /**
     * @description: login
     */
    async login(loginType: string, params: LoginReq | SmsLoginReq): Promise<any> {
      let loginRes: any = null;
      if (loginType === "sms") {
        loginRes = await UserApi.loginBySms(params as SmsLoginReq);
      } else {
        loginRes = await UserApi.login(params as LoginReq);
      }
      return await this.onLoginSuccess(loginRes);
    },

    async loginByTwoFactor(form: any) {
      const loginRes = await UserApi.loginByTwoFactor(form);
      return await this.onLoginSuccess(loginRes);
    },

    async loginByPasskey(form: any) {
      const loginRes = await UserApi.loginByPasskey(form);
      return await this.onLoginSuccess(loginRes);
    },

    async registerPasskey(form: any) {
      return await UserApi.registerPasskey(form);
    },

    async getUserInfoAction(): Promise<UserInfoRes> {
      const userInfo = await UserApi.mine();
      this.setUserInfo(userInfo);
      return userInfo;
    },

    async loadUserInfo() {
      await this.getUserInfoAction();
    },

    async onLoginSuccess(loginData: any) {
      const { token, expire } = loginData;
      // save token
      this.setToken(token, expire);
      // get user info
      // await this.getUserInfoAction();
      // const userInfo = await this.getUserInfoAction();
      mitter.emit("app.login", { ...loginData });
      await router.replace("/index");
    },

    /**
     * @description: logout
     */
    async logout(goLogin = true, from401 = false) {
      if (!from401 && this.getToken) {
        try {
          await UserApi.logout(); //主要是清空cookie
        } catch (e) {
          console.error("注销登录请求失败：", e);
        }
      }

      this.resetState();
      resetAllStores();
      // 第三方登录注销
      await this.oauthLogout();
      goLogin && router.push("/login");
      mitter.emit("app.logout");
    },

    async oauthLogout() {
      const providers = await UserApi.OauthProviders();
      for (const provider of providers) {
        if (provider.logoutUrl) {
          try {
            await request({
              url: provider.logoutUrl,
              method: "get",
              withCredentials: true,
              showErrorNotify: false,
            });
          } catch (e) {
            console.error("注销第三方登录失败：", e);
          }
        }
      }
    },
    /**
     * @description: Confirm before logging out
     */
    confirmLoginOut() {
      const { t } = useI18n();
      Modal.confirm({
        iconType: "warning",
        title: t("app.login.logoutTip"),
        content: t("app.login.logoutMessage"),
        onOk: async () => {
          await this.logout(true);
        },
      });
    },
  },
});
