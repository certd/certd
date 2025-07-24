<template>
  <div class="main login-page">
    <a-form v-if="!twoFactor.loginId" ref="formRef" class="user-layout-login" name="custom-validation" :model="formState" v-bind="layout" @finish="handleFinish" @finish-failed="handleFinishFailed">
      <!--      <div class="login-title">登录</div>-->
      <a-tabs v-model:active-key="formState.loginType" :tab-bar-style="{ textAlign: 'center', borderBottom: 'unset' }">
        <a-tab-pane key="password" :tab="t('authentication.passwordTab')" :disabled="sysPublicSettings.passwordLoginEnabled !== true">
          <template v-if="formState.loginType === 'password'">
            <!--      <div class="login-title">登录</div>-->
            <a-form-item required has-feedback name="username" :rules="rules.username">
              <a-input v-model:value="formState.username" :placeholder="t('authentication.usernamePlaceholder')" autocomplete="off">
                <template #prefix>
                  <fs-icon icon="ion:phone-portrait-outline"></fs-icon>
                </template>
              </a-input>
            </a-form-item>
            <a-form-item has-feedback name="password" :rules="rules.password">
              <a-input-password v-model:value="formState.password" :placeholder="t('authentication.passwordPlaceholder')" autocomplete="off">
                <template #prefix>
                  <fs-icon icon="ion:lock-closed-outline"></fs-icon>
                </template>
              </a-input-password>
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

            <a-form-item has-feedback name="imgCode">
              <image-code v-model:value="formState.imgCode" v-model:random-str="formState.randomStr"></image-code>
            </a-form-item>

            <a-form-item name="smsCode" :rules="rules.smsCode">
              <sms-code v-model:value="formState.smsCode" :img-code="formState.imgCode" :mobile="formState.mobile" :phone-code="formState.phoneCode" :random-str="formState.randomStr" />
            </a-form-item>
          </template>
        </a-tab-pane>
      </a-tabs>
      <a-form-item>
        <a-button type="primary" size="large" html-type="submit" :loading="loading" class="login-button">
          {{ t("authentication.loginButton") }}
        </a-button>

        <div v-if="!!settingStore.sysPublic.selfServicePasswordRetrievalEnabled" class="mt-2">
          <router-link :to="{ name: 'forgotPassword' }">
            {{ t("authentication.forgotPassword") }}
          </router-link>
        </div>
      </a-form-item>

      <a-form-item class="user-login-other">
        <div class="flex flex-between justify-between items-center">
          <language-toggle class="color-blue"></language-toggle>
          <router-link v-if="hasRegisterTypeEnabled()" class="register" :to="{ name: 'register' }">
            {{ t("authentication.registerLink") }}
          </router-link>
        </div>
      </a-form-item>
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

      <a-form-item class="user-login-other">
        <a class="register" @click="twoFactor.loginId = null"> 返回 </a>
      </a-form-item>
    </a-form>
  </div>
</template>
<script lang="ts">
import { defineComponent, nextTick, reactive, ref, toRaw } from "vue";
import { useUserStore } from "/src/store/user";
import { useSettingStore } from "/@/store/settings";
import { utils } from "@fast-crud/fast-crud";
import ImageCode from "/@/views/framework/login/image-code.vue";
import SmsCode from "/@/views/framework/login/sms-code.vue";
import { useI18n } from "/@/locales";
import { LanguageToggle } from "/@/vben/layouts";

export default defineComponent({
  name: "LoginPage",
  components: { LanguageToggle, SmsCode, ImageCode },
  setup() {
    const { t } = useI18n();
    const verifyCodeInputRef = ref();
    const loading = ref(false);
    const userStore = useUserStore();
    const settingStore = useSettingStore();
    const formRef = ref();
    const formState = reactive({
      username: "",
      phoneCode: "86",
      mobile: "",
      password: "",
      loginType: "password", //password
      imgCode: "",
      smsCode: "",
      randomStr: "",
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

    const handleTwoFactorSubmit = async () => {
      await userStore.loginByTwoFactor(twoFactor);
    };

    const handleFinish = async (values: any) => {
      loading.value = true;
      try {
        const loginType = formState.loginType;
        await userStore.login(loginType, toRaw(formState));
      } catch (e: any) {
        //@ts-ignore
        if (e.code === 10020) {
          //双重认证
          //@ts-ignore
          twoFactor.loginId = e.data;
          await nextTick();
          verifyCodeInputRef.value.focus();
        } else {
          throw e;
        }
      } finally {
        loading.value = false;
      }
    };

    const handleFinishFailed = (errors: any) => {
      utils.logger.log(errors);
    };

    const resetForm = () => {
      formRef.value.resetFields();
    };

    const isLoginError = ref();

    const sysPublicSettings = settingStore.getSysPublic;

    function hasRegisterTypeEnabled() {
      return sysPublicSettings.registerEnabled && (sysPublicSettings.usernameRegisterEnabled || sysPublicSettings.emailRegisterEnabled);
    }

    return {
      t,
      loading,
      formState,
      formRef,
      rules,
      layout,
      handleFinishFailed,
      handleFinish,
      resetForm,
      isLoginError,
      sysPublicSettings,
      hasRegisterTypeEnabled,
      twoFactor,
      handleTwoFactorSubmit,
      verifyCodeInputRef,
      settingStore,
    };
  },
});
</script>

<style lang="less">

.login-page.main {
  //margin: 20px !important;
  margin-bottom: 100px;

  .user-layout-login {
    //label {
    //  font-size: 14px;
    //}

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
      //line-height: 22px;

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

    .fs-icon {
      color: rgba(0, 0, 0, 0.45);
      margin-right: 4px;
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
