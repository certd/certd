<template>
  <div class="main login-page">
    <a-form v-if="!twoFactor.loginId" ref="formRef" class="user-layout-login" name="custom-validation" :model="formState" v-bind="layout" @finish="handleFinish" @finish-failed="handleFinishFailed">
      <!--      <div class="login-title">登录</div>-->
      <template v-if="!isOauthOnly">
        <a-tabs v-model:active-key="formState.loginType" :tab-bar-style="{ textAlign: 'center', borderBottom: 'unset' }">
          <a-tab-pane key="password" :tab="t('authentication.passwordTab')">
            <template v-if="formState.loginType === 'password'">
              <!--      <div class="login-title">登录</div>-->
              <a-form-item required has-feedback name="username" :rules="rules.username">
                <a-input v-model:value="formState.username" :placeholder="t('authentication.usernamePlaceholder')" autocomplete="off" @keydown.enter="handleFinish">
                  <template #prefix>
                    <fs-icon icon="ion:phone-portrait-outline"></fs-icon>
                  </template>
                </a-input>
              </a-form-item>
              <a-form-item has-feedback name="password" :rules="rules.password">
                <a-input-password v-model:value="formState.password" :placeholder="t('authentication.passwordPlaceholder')" autocomplete="off" @keyup.enter="handleFinish">
                  <template #prefix>
                    <fs-icon icon="ion:lock-closed-outline"></fs-icon>
                  </template>
                </a-input-password>
              </a-form-item>

              <a-form-item v-if="settingStore.sysPublic.captchaEnabled" has-feedback required name="captcha" :rules="rules.captcha">
                <CaptchaInput v-model:model-value="formState.captcha" @keydown.enter="handleFinish"></CaptchaInput>
              </a-form-item>
            </template>
          </a-tab-pane>
          <a-tab-pane v-if="sysPublicSettings.smsLoginEnabled === true" key="sms" :tab="t('authentication.smsTab')">
            <template v-if="formState.loginType === 'sms'">
              <a-form-item has-feedback name="mobile" :rules="rules.mobile">
                <a-input v-model:value="formState.mobile" :placeholder="t('authentication.mobilePlaceholder')" autocomplete="off">
                  <template #prefix>
                    <fs-icon icon="ion:phone-portrait-outline"></fs-icon>
                  </template>
                </a-input>
              </a-form-item>

              <a-form-item has-feedback name="smsCaptcha">
                <CaptchaInput v-model:model-value="formState.smsCaptcha" @keydown.enter="handleFinish"></CaptchaInput>
              </a-form-item>

              <a-form-item name="smsCode" :rules="rules.smsCode">
                <sms-code v-model:value="formState.smsCode" :captcha="formState.smsCaptcha" :mobile="formState.mobile" :phone-code="formState.phoneCode" @error="formState.smsCaptcha = null" />
              </a-form-item>
            </template>
          </a-tab-pane>
          <a-tab-pane key="passkey" :tab="t('authentication.passkeyTab')">
            <template v-if="formState.loginType === 'passkey'">
              <div v-if="!passkeySupported" class="text-red-500 text-sm mt-2 text-center mb-10">
                {{ t("authentication.passkeyNotSupported") }}
              </div>
            </template>
          </a-tab-pane>
        </a-tabs>
        <a-form-item>
          <a-button v-if="formState.loginType !== 'passkey'" type="primary" size="large" html-type="button" :loading="loading" class="login-button" @click="handleFinish">
            {{ queryBindCode ? t("authentication.bindButton") : t("authentication.loginButton") }}
          </a-button>
          <a-button v-else type="primary" size="large" html-type="button" :loading="loading" class="login-button" :disabled="!passkeySupported" @click="handlePasskeyLogin">
            {{ t("authentication.passkeyLogin") }}
          </a-button>
        </a-form-item>
        <a-form-item>
          <div class="mt-2 flex justify-between items-center">
            <div class="flex items-center gap-2">
              <language-toggle class="text-blue-500"></language-toggle>
              <router-link v-if="!!settingStore.sysPublic.selfServicePasswordRetrievalEnabled && !queryBindCode" :to="{ name: 'forgotPassword' }">
                {{ t("authentication.forgotPassword") }}
              </router-link>
              <a v-else v-comm="false" href="https://certd.docmirror.cn/guide/use/forgotpasswd/" target="_blank">
                {{ t("authentication.forgotPassword") }}
              </a>
            </div>

            <router-link v-if="hasRegisterTypeEnabled() && !queryBindCode" class="register" :to="{ name: 'register' }">
              {{ t("authentication.registerLink") }}
            </router-link>
          </div>
        </a-form-item>
      </template>

      <div v-if="!queryBindCode && settingStore.sysPublic.oauthEnabled && settingStore.isPlus" class="w-full">
        <oauth-footer :oauth-only="isOauthOnly"></oauth-footer>
      </div>
    </a-form>
    <a-form v-else ref="twoFactorFormRef" class="user-layout-login" :model="twoFactor" v-bind="layout">
      <div class="mb-10 flex flex-center">请打开您的Authenticator APP，获取动态验证码。</div>
      <a-form-item name="verifyCode">
        <a-input ref="verifyCodeInputRef" v-model:value="twoFactor.verifyCode" placeholder="请输入动态验证码" allow-clear @keydown.enter="handleTwoFactorSubmit">
          <template #prefix>
            <fs-icon icon="ion:lock-closed-outline"></fs-icon>
          </template>
        </a-input>
      </a-form-item>
      <a-form-item>
        <loading-button type="primary" size="large" html-type="button" class="login-button" :click="handleTwoFactorSubmit">OTP验证登录</loading-button>
      </a-form-item>

      <a-form-item class="mt-10">
        <a class="register" @click="twoFactor.loginId = null"> 返回 </a>
      </a-form-item>
    </a-form>
  </div>
</template>
<script lang="ts" setup>
import { computed, nextTick, reactive, ref, toRaw, onMounted } from "vue";
import { useUserStore } from "/src/store/user";
import { useSettingStore } from "/@/store/settings";
import { utils } from "@fast-crud/fast-crud";
import SmsCode from "/@/views/framework/login/sms-code.vue";
import { useI18n } from "/@/locales";
import { LanguageToggle } from "/@/vben/layouts";
import CaptchaInput from "/@/components/captcha/captcha-input.vue";
import { useRoute } from "vue-router";
import OauthFooter from "/@/views/framework/oauth/oauth-footer.vue";
import * as oauthApi from "../oauth/api";
import { notification } from "ant-design-vue";
import { request } from "/src/api/service";
import * as UserApi from "/src/store/user/api.user";

const { t } = useI18n();
const route = useRoute();
const userStore = useUserStore();

const queryBindCode = ref(route.query.bindCode as string | undefined);
const queryOauthOnly = route.query.oauthOnly as string;
const urlLoginType = route.query.loginType as string | undefined;
const verifyCodeInputRef = ref();
const loading = ref(false);

const settingStore = useSettingStore();
const formRef = ref();
let defaultLoginType = settingStore.sysPublic.defaultLoginType || "password";
if (defaultLoginType === "sms") {
  if (!settingStore.sysPublic.smsLoginEnabled || !settingStore.isComm) {
    defaultLoginType = "password";
  }
}
const formState = reactive({
  username: "",
  phoneCode: "86",
  mobile: "",
  password: "",
  loginType: urlLoginType || defaultLoginType,
  smsCode: "",
  captcha: null,
  smsCaptcha: null,
});

const rules = {
  mobile: [
    {
      required: true,
      message: "请输入手机号",
    },
  ],
  username: [
    {
      required: true,
      message: "请输入用户名",
    },
  ],
  password: [
    {
      required: true,
      message: "请输入登录密码",
    },
  ],
  smsCode: [
    {
      required: true,
      message: "请输入短信验证码",
    },
  ],
  captcha: [
    {
      required: true,
      message: "请进行验证码验证",
    },
  ],
};
const layout = {
  labelCol: {
    span: 0,
  },
  wrapperCol: {
    span: 24,
  },
};

const twoFactor = reactive({
  loginId: "",
  verifyCode: "",
});

const passkeySupported = ref(false);
const passkeyEnabled = ref(false);

const checkPasskeySupport = () => {
  passkeySupported.value = false;
  if (typeof window !== "undefined" && "credentials" in navigator && "PublicKeyCredential" in window) {
    passkeySupported.value = true;
  }
};

const handlePasskeyLogin = async () => {
  if (!passkeySupported.value) {
    notification.error({ message: t("authentication.passkeyNotSupported") });
    return;
  }

  loading.value = true;
  try {
    const optionsResponse: any = await request({
      url: "/passkey/generateAuthentication",
      method: "post",
    });
    const options = optionsResponse;

    const credential = await (navigator.credentials as any).get({
      publicKey: {
        challenge: Uint8Array.from(atob(options.challenge.replace(/-/g, "+").replace(/_/g, "/")), c => c.charCodeAt(0)),
        rpId: options.rpId,
        allowCredentials: options.allowCredentials || [],
        timeout: options.timeout || 60000,
      },
    });

    if (!credential) {
      throw new Error("Passkey认证失败");
    }

    const loginRes: any = await UserApi.loginByPasskey({
      credential,
      challenge: options.challenge,
    });

    await userStore.onLoginSuccess(loginRes);
  } catch (e: any) {
    console.error("Passkey登录失败:", e);
    notification.error({ message: e.message || "Passkey登录失败" });
  } finally {
    loading.value = false;
  }
};

const handleFinish = async () => {
  loading.value = true;
  try {
    const loginType = formState.loginType;
    await userStore.login(loginType, toRaw(formState));
    if (queryBindCode.value) {
      await oauthApi.BindUser(queryBindCode.value);
      notification.success({ message: "绑定第三方账号成功" });
    }
  } catch (e: any) {
    if (e.code === 10020) {
      twoFactor.loginId = e.data;
      await nextTick();
      verifyCodeInputRef.value.focus();
    } else {
      throw e;
    }
  } finally {
    loading.value = false;
    formState.captcha = null;
  }
};

const handleFinishFailed = (errors: any) => {
  utils.logger.log(errors);
};

const handleTwoFactorSubmit = async () => {
  await userStore.loginByTwoFactor(twoFactor);
  if (queryBindCode.value) {
    await oauthApi.BindUser(queryBindCode.value);
    notification.success({ message: "绑定第三方账号成功" });
  }
};

const sysPublicSettings = settingStore.getSysPublic;

const hasRegisterTypeEnabled = () => {
  return sysPublicSettings.registerEnabled && (sysPublicSettings.usernameRegisterEnabled || sysPublicSettings.emailRegisterEnabled || sysPublicSettings.mobileRegisterEnabled || sysPublicSettings.smsLoginEnabled);
};

const isOauthOnly = computed(() => {
  if (queryOauthOnly === "false" || queryOauthOnly === "0") {
    return false;
  }
  return sysPublicSettings.oauthOnly && settingStore.isPlus && sysPublicSettings.oauthEnabled;
});

onMounted(() => {
  checkPasskeySupport();
});
</script>

<style lang="less">
.login-page.main {
  margin-bottom: 100px;

  .user-layout-login {
    .fs-icon {
      margin-right: 4px;
    }

    .login-title {
      font-size: 18px;
      text-align: center;
      margin: 20px;
    }

    .getCaptcha {
      display: block;
      width: 100%;
    }

    .image-code {
      height: 34px;
    }

    .input-right {
      width: 160px;
      margin-left: 10px;
      background: #cfcfcf !important;
    }

    .forge-password {
      font-size: 14px;
    }

    button.login-button {
      padding: 0 15px;
      font-size: 16px;
      width: 100%;
    }

    .user-login-other {
      text-align: left;
      margin-top: 30px;
      margin-bottom: 30px;

      .item-icon {
        font-size: 24px;
        color: rgba(0, 0, 0, 0.2);
        margin-left: 16px;
        vertical-align: middle;
        cursor: pointer;
        transition: color 0.3s;

        &:hover {
        }
      }

      .register {
        float: right;
      }
    }

    .ant-input-affix-wrapper {
      line-height: 1.8 !important;
      font-size: 14px !important;

      > * {
        line-height: 1.8 !important;
        font-size: 14px !important;
      }
    }
  }
}
</style>
