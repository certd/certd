<template>
  <div class="main">
    <a-form ref="formRef" class="user-layout-register" name="custom-validation" :model="formState" :rules="rules" v-bind="layout" :label-col="{ span: 6 }" @finish="handleFinish" @finish-failed="handleFinishFailed">
      <a-tabs v-model:active-key="registerType" @change="handleTabChange">
        <a-tab-pane key="username" tab="用户名注册" :disabled="!settingsStore.sysPublic.usernameRegisterEnabled">
          <template v-if="registerType === 'username'">
            <a-form-item required has-feedback name="username" label="用户名" :rules="rules.username">
              <a-input v-model:value="formState.username" placeholder="用户名" size="large" autocomplete="off">
                <template #prefix>
                  <fs-icon icon="ion:person-outline"></fs-icon>
                </template>
              </a-input>
            </a-form-item>
            <a-form-item has-feedback name="password" label="密码" :rules="rules.password">
              <a-input-password v-model:value="formState.password" placeholder="密码" size="large" autocomplete="off">
                <template #prefix>
                  <fs-icon icon="ion:lock-closed-outline"></fs-icon>
                </template>
              </a-input-password>
            </a-form-item>
            <a-form-item has-feedback name="confirmPassword" label="确认密码">
              <a-input-password v-model:value="formState.confirmPassword" placeholder="确认密码" size="large" autocomplete="off" :rules="rules.confirmPassword">
                <template #prefix>
                  <fs-icon icon="ion:lock-closed-outline"></fs-icon>
                </template>
              </a-input-password>
            </a-form-item>
            <a-form-item has-feedback name="captcha" label="验证码" :rules="rules.captcha">
              <CaptchaInput v-model:model-value="formState.captcha"></CaptchaInput>
            </a-form-item>
          </template>
        </a-tab-pane>
        <a-tab-pane v-if="settingsStore.sysPublic.emailRegisterEnabled !== false" key="email" tab="邮箱注册">
          <template v-if="registerType === 'email'">
            <a-form-item required has-feedback name="username" label="用户名" :rules="rules.username">
              <a-input v-model:value="formState.username" placeholder="用户名" size="large" autocomplete="off">
                <template #prefix>
                  <fs-icon icon="ion:person-outline"></fs-icon>
                </template>
              </a-input>
            </a-form-item>
            <a-form-item required has-feedback name="email" label="邮箱">
              <a-input v-model:value="formState.email" placeholder="邮箱" size="large" autocomplete="off">
                <template #prefix>
                  <fs-icon icon="ion:mail-outline"></fs-icon>
                </template>
              </a-input>
            </a-form-item>
            <a-form-item has-feedback name="password" label="密码">
              <a-input-password v-model:value="formState.password" placeholder="密码" size="large" autocomplete="off">
                <template #prefix>
                  <fs-icon icon="ion:lock-closed-outline"></fs-icon>
                </template>
              </a-input-password>
            </a-form-item>
            <a-form-item has-feedback name="confirmPassword" label="确认密码">
              <a-input-password v-model:value="formState.confirmPassword" placeholder="确认密码" size="large" autocomplete="off">
                <template #prefix>
                  <fs-icon icon="ion:lock-closed-outline"></fs-icon>
                </template>
              </a-input-password>
            </a-form-item>

            <a-form-item has-feedback name="captchaForEmail" label="验证码" :rules="rules.captchaForEmail">
              <CaptchaInput v-model:model-value="formState.captchaForEmail"></CaptchaInput>
            </a-form-item>

            <a-form-item has-feedback name="validateCode" :rules="rules.validateCode" label="邮件验证码">
              <email-code v-model:value="formState.validateCode" :captcha="formState.captchaForEmail" :email="formState.email" @error="formState.captchaForEmail = null" />
            </a-form-item>
          </template>
        </a-tab-pane>

        <a-tab-pane v-if="settingsStore.sysPublic.smsLoginEnabled" key="mobile" tab="手机号注册"> </a-tab-pane>
      </a-tabs>

      <a-form-item>
        <a-button type="primary" size="large" html-type="submit" class="login-button">注册</a-button>
      </a-form-item>

      <a-form-item class="user-login-other">
        <router-link class="register" :to="{ name: 'login' }"> 登录 </router-link>
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
export default defineComponent({
  name: "RegisterPage",
  components: { CaptchaInput, EmailCode },
  setup() {
    const settingsStore = useSettingStore();
    const registerType = ref("email");
    if (!settingsStore.sysPublic.emailRegisterEnabled) {
      registerType.value = "username";
      if (!settingsStore.sysPublic.usernameRegisterEnabled) {
        registerType.value = "";
        notification.error({
          message: "没有启用任何一种注册方式",
        });
      }
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
    });

    const rules = {
      username: [
        {
          required: true,
          trigger: "change",
          message: "请输入用户名",
        },
      ],
      email: [
        {
          required: true,
          trigger: "change",
          message: "请输入邮箱",
        },
        {
          type: "email",
          message: "请输入正确的邮箱",
        },
      ],
      password: [
        {
          required: true,
          trigger: "change",
          message: "请输入密码",
        },
      ],
      confirmPassword: [
        {
          required: true,
          trigger: "change",
          message: "请确认密码",
        },
        {
          validator: async (rule: any, value: any) => {
            if (value && value !== formState.password) {
              throw new Error("两次输入密码不一致");
            }
            return true;
          },
        },
      ],

      smsCode: [
        {
          required: true,
          message: "请输入短信验证码",
        },
      ],
      validateCode: [
        {
          required: true,
          message: "请输入邮件验证码",
        },
      ],
      captcha: [
        {
          required: true,
          message: "请通过验证码",
        },
      ],
      captchaForEmail: [
        {
          required: true,
          message: "请通过验证码",
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
        await userStore.register(
          toRaw({
            type: registerType.value,
            password: formState.password,
            username: formState.username,
            email: formState.email,
            captcha: registerType.value === "email" ? formState.captchaForEmail : formState.captcha,
            validateCode: formState.validateCode,
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
    const handleTabChange = (key: string) => {
      if (key === "mobile") {
        router.push({ path: "/login", query: { loginType: "sms" } });
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
