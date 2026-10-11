<template>
  <div class="main">
    <a-form ref="formRef" class="user-layout-register" name="custom-validation" :model="formState" :rules="rules" v-bind="layout" :label-col="{ span: 6 }" @finish="handleFinish" @finish-failed="handleFinishFailed">
      <a-tabs v-model:active-key="registerType" @change="handleTabChange">
        <a-tab-pane v-if="settingsStore.sysPublic.usernameRegisterEnabled !== false" key="username" :tab="t('certd.auth.register.usernameTab')">
          <template v-if="registerType === 'username'">
            <a-form-item required has-feedback name="username" :label="t('certd.auth.register.username')" :rules="rules.username">
              <a-input v-model:value="formState.username" :placeholder="t('certd.auth.register.username')" size="large" autocomplete="off">
                <template #prefix>
                  <fs-icon icon="ion:person-outline"></fs-icon>
                </template>
              </a-input>
            </a-form-item>
            <a-form-item has-feedback name="password" :label="t('certd.auth.register.password')" :rules="rules.password">
              <a-input-password v-model:value="formState.password" :placeholder="t('certd.auth.register.password')" size="large" autocomplete="off">
                <template #prefix>
                  <fs-icon icon="ion:lock-closed-outline"></fs-icon>
                </template>
              </a-input-password>
            </a-form-item>
            <a-form-item has-feedback name="confirmPassword" :label="t('certd.auth.register.confirmPassword')">
              <a-input-password v-model:value="formState.confirmPassword" :placeholder="t('certd.auth.register.confirmPassword')" size="large" autocomplete="off" :rules="rules.confirmPassword">
                <template #prefix>
                  <fs-icon icon="ion:lock-closed-outline"></fs-icon>
                </template>
              </a-input-password>
            </a-form-item>
            <a-form-item has-feedback name="captcha" :label="t('certd.auth.register.captcha')" :rules="rules.captcha">
              <CaptchaInput v-model:model-value="formState.captcha"></CaptchaInput>
            </a-form-item>
          </template>
        </a-tab-pane>
        <a-tab-pane v-if="settingsStore.sysPublic.emailRegisterEnabled !== false" key="email" :tab="t('certd.auth.register.emailTab')">
          <template v-if="registerType === 'email'">
            <a-form-item required has-feedback name="username" :label="t('certd.auth.register.username')" :rules="rules.username">
              <a-input v-model:value="formState.username" :placeholder="t('certd.auth.register.username')" size="large" autocomplete="off">
                <template #prefix>
                  <fs-icon icon="ion:person-outline"></fs-icon>
                </template>
              </a-input>
            </a-form-item>
            <a-form-item required has-feedback name="email" :label="t('certd.auth.register.email')">
              <a-input v-model:value="formState.email" :placeholder="t('certd.auth.register.email')" size="large" autocomplete="off">
                <template #prefix>
                  <fs-icon icon="ion:mail-outline"></fs-icon>
                </template>
              </a-input>
            </a-form-item>
            <a-form-item has-feedback name="password" :label="t('certd.auth.register.password')">
              <a-input-password v-model:value="formState.password" :placeholder="t('certd.auth.register.password')" size="large" autocomplete="off">
                <template #prefix>
                  <fs-icon icon="ion:lock-closed-outline"></fs-icon>
                </template>
              </a-input-password>
            </a-form-item>
            <a-form-item has-feedback name="confirmPassword" :label="t('certd.auth.register.confirmPassword')">
              <a-input-password v-model:value="formState.confirmPassword" :placeholder="t('certd.auth.register.confirmPassword')" size="large" autocomplete="off">
                <template #prefix>
                  <fs-icon icon="ion:lock-closed-outline"></fs-icon>
                </template>
              </a-input-password>
            </a-form-item>

            <a-form-item has-feedback name="captchaForEmail" :label="t('certd.auth.register.captcha')" :rules="rules.captchaForEmail">
              <CaptchaInput v-model:model-value="formState.captchaForEmail"></CaptchaInput>
            </a-form-item>

            <a-form-item has-feedback name="validateCode" :rules="rules.validateCode" :label="t('certd.auth.register.emailCode')">
              <email-code v-model:value="formState.validateCode" :captcha="formState.captchaForEmail" :email="formState.email" @error="formState.captchaForEmail = null" />
            </a-form-item>
          </template>
        </a-tab-pane>

        <a-tab-pane v-if="settingsStore.sysPublic.smsLoginEnabled" key="mobile" :tab="t('certd.auth.register.mobileTab')">
          <div class="p-20">
            <a-button type="primary" html-type="button" class="login-button" @click="goLogin">{{ t("certd.auth.register.mobileLogin") }}</a-button>
          </div>
        </a-tab-pane>
      </a-tabs>

      <a-form-item v-if="registerType !== 'mobile'" has-feedback name="inviteCode" :label="t('certd.auth.register.inviteCode')">
        <a-input v-model:value="formState.inviteCode" :placeholder="t('certd.auth.register.inviteCodeOptional')" size="large" autocomplete="off">
          <template #prefix>
            <fs-icon icon="ion:gift-outline"></fs-icon>
          </template>
        </a-input>
      </a-form-item>

      <a-form-item v-if="registerType !== 'mobile'">
        <a-button type="primary" size="large" html-type="submit" class="login-button">{{ t("certd.auth.register.submit") }}</a-button>
      </a-form-item>

      <a-form-item class="user-login-other">
        <router-link class="register" :to="{ name: 'login' }"> {{ t("certd.auth.register.login") }} </router-link>
      </a-form-item>
    </a-form>
  </div>
</template>
<script lang="ts">
import { defineComponent, reactive, ref, toRaw } from "vue";
import { useUserStore } from "/src/store/user";
import { utils } from "@fast-crud/fast-crud";
import EmailCode from "./email-code.vue";
import { useSettingStore } from "/@/store/settings";
import { notification } from "ant-design-vue";
import CaptchaInput from "/@/components/captcha/captcha-input.vue";
import { useRouter } from "vue-router";
import { inviteUtils } from "/@/utils/util.invite";
import { useI18n } from "vue-i18n";
export default defineComponent({
  name: "RegisterPage",
  components: { CaptchaInput, EmailCode },
  setup() {
    const settingsStore = useSettingStore();
    const { t } = useI18n();
    const registerType = ref("email");
    if (settingsStore.sysPublic.emailRegisterEnabled) {
      registerType.value = "email";
    } else if (settingsStore.sysPublic.usernameRegisterEnabled) {
      registerType.value = "username";
    } else if (settingsStore.sysPublic.smsLoginEnabled) {
      registerType.value = "mobile";
    } else {
      notification.error({
        message: t("certd.auth.register.noMethodEnabled"),
      });
    }
    const userStore = useUserStore();
    const formRef = ref();
    const formState: any = reactive({
      mobile: "",
      phoneCode: "",
      email: "",
      username: "",
      password: "",
      confirmPassword: "",
      captcha: null,
      captchaForEmail: null,
      inviteCode: inviteUtils.get(),
    });

    const rules = {
      username: [
        {
          required: true,
          trigger: "change",
          message: t("certd.auth.register.usernameRequired"),
        },
      ],
      email: [
        {
          required: true,
          trigger: "change",
          message: t("certd.auth.register.emailRequired"),
        },
        {
          type: "email",
          message: t("certd.auth.register.emailInvalid"),
        },
      ],
      password: [
        {
          required: true,
          trigger: "change",
          message: t("certd.auth.register.passwordRequired"),
        },
      ],
      confirmPassword: [
        {
          required: true,
          trigger: "change",
          message: t("certd.auth.register.confirmPasswordRequired"),
        },
        {
          validator: async (rule: any, value: any) => {
            if (value && value !== formState.password) {
              throw new Error(t("certd.auth.register.passwordMismatch"));
            }
            return true;
          },
        },
      ],

      smsCode: [
        {
          required: true,
          message: t("certd.auth.register.smsCodeRequired"),
        },
      ],
      validateCode: [
        {
          required: true,
          message: t("certd.auth.register.emailCodeRequired"),
        },
      ],
      captcha: [
        {
          required: true,
          message: t("certd.auth.register.captchaRequired"),
        },
      ],
      captchaForEmail: [
        {
          required: true,
          message: t("certd.auth.register.captchaRequired"),
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

    const handleFinish = async (values: any) => {
      try {
        //先注销登录
        userStore.resetState();
        await userStore.register(
          toRaw({
            type: registerType.value,
            password: formState.password,
            username: formState.username,
            email: formState.email,
            captcha: registerType.value === "email" ? formState.captchaForEmail : formState.captcha,
            validateCode: formState.validateCode,
            inviteCode: formState.inviteCode,
          }) as any
        );
      } finally {
        formState.captcha = null;
      }
    };

    const handleFinishFailed = (errors: any) => {
      utils.logger.log(errors);
    };

    const resetForm = () => {
      formRef.value.resetFields();
    };

    const router = useRouter();
    const goLogin = () => {
      router.replace({ path: "/login", query: { loginType: "sms" } });
    };
    const handleTabChange = (key: string) => {
      if (key === "mobile") {
        goLogin();
      }
    };

    return {
      formState,
      formRef,
      rules,
      layout,
      handleFinishFailed,
      handleFinish,
      resetForm,
      registerType,
      settingsStore,
      handleTabChange,
      goLogin,
      t,
    };
  },
});
</script>

<style lang="less">
.user-layout-register {
  label {
    font-size: 14px;
  }

  .ant-input-affix-wrapper {
    line-height: 1.8 !important;
    font-size: 14px !important;
    > * {
      line-height: 1.8 !important;
      font-size: 14px !important;
    }
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

  .login-title {
    // color: @primary-color;
    font-size: 18px;
    text-align: center;
    margin: 30px;
    margin-top: 50px;
  }

  .forge-password {
    font-size: 14px;
  }

  button.login-button {
    padding: 0 15px;
    font-size: 16px;
    height: 40px;
    width: 100%;
  }

  .user-login-other {
    text-align: left;
    margin-top: 30px;
    margin-bottom: 30px;
    line-height: 22px;

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
  .iconify {
    color: rgba(0, 0, 0, 0.45);
  }
}
</style>
