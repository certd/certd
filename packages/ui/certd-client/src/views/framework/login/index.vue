<template>
  <div class="main">
    <a-form
      ref="formRef"
      class="user-layout-login"
      name="custom-validation"
      :model="formState"
      :rules="rules"
      v-bind="layout"
      @finish="handleFinish"
      @finish-failed="handleFinishFailed"
    >
      <!--      <div class="login-title">登录</div>-->
      <a-tabs :active-key="formState.loginType" :tab-bar-style="{ textAlign: 'center', borderBottom: 'unset' }">
        <a-tab-pane key="password" tab="用户名密码登录">
          <a-alert v-if="isLoginError" type="error" show-icon style="margin-bottom: 24px" message="用户名或密码错误" />

          <!--      <div class="login-title">登录</div>-->
          <a-form-item required has-feedback name="username">
            <a-input v-model:value="formState.username" placeholder="请输入用户名" size="large" autocomplete="off">
              <template #prefix>
                <span class="iconify" data-icon="ion:phone-portrait-outline" data-inline="false"></span>
              </template>
            </a-input>
          </a-form-item>
          <a-form-item has-feedback name="password">
            <a-input-password v-model:value="formState.password" placeholder="请输入密码" size="large" autocomplete="off">
              <template #prefix>
                <span class="iconify" data-icon="ion:lock-closed-outline" data-inline="false"></span>
              </template>
            </a-input-password>
          </a-form-item>
        </a-tab-pane>
        <a-tab-pane key="smsCode" tab="短信验证码登录" :disabled="true" title="暂不支持">
          <a-form-item required has-feedback name="mobile">
            <a-input v-model:value="formState.mobile" placeholder="请输入手机号" size="large" autocomplete="off">
              <template #prefix>
                <span class="iconify" data-icon="ion:phone-portrait-outline" data-inline="false"></span>
              </template>
            </a-input>
          </a-form-item>
          <a-form-item has-feedback name="imgCode">
            <a-row :gutter="16">
              <a-col class="gutter-row" :span="16">
                <a-input v-model:value="formState.imgCode" placeholder="请输入图片验证码" size="large" autocomplete="off">
                  <template #prefix>
                    <span class="iconify" data-icon="ion:image-outline" data-inline="false"></span>
                  </template>
                </a-input>
              </a-col>
              <a-col class="gutter-row" :span="8">
                <img class="image-code" :src="imageCodeUrl" @click="resetImageCode" />
              </a-col>
            </a-row>
          </a-form-item>

          <a-form-item name="smsCode">
            <a-row :gutter="16">
              <a-col class="gutter-row" :span="16">
                <a-input v-model:value="formState.smsCode" size="large" placeholder="短信验证码">
                  <template #prefix>
                    <span class="iconify" data-icon="ion:mail-outline" data-inline="false"></span>
                  </template>
                </a-input>
              </a-col>
              <a-col class="gutter-row" :span="8">
                <a-button
                  class="getCaptcha"
                  tabindex="-1"
                  :disabled="smsSendBtnDisabled"
                  @click="sendSmsCode"
                  v-text="smsTime <= 0 ? '发送' : smsTime + ' s'"
                ></a-button>
              </a-col>
            </a-row>
          </a-form-item>
        </a-tab-pane>
      </a-tabs>
      <a-form-item>
        <a-button type="primary" size="large" html-type="submit" :loading="loading" class="login-button">登录</a-button>
      </a-form-item>

      <a-form-item class="user-login-other">
        <router-link v-if="sysPublicSettings.registerEnabled" class="register" :to="{ name: 'register' }"> 注册 </router-link>
      </a-form-item>
    </a-form>
  </div>
</template>
<script lang="ts">
import { defineComponent, reactive, ref, toRaw, computed } from "vue";
import { useUserStore } from "/src/store/modules/user";
import { useSettingStore } from "/@/store/modules/settings";
import { utils } from "@fast-crud/fast-crud";
export default defineComponent({
  name: "LoginPage",
  setup() {
    const loading = ref(false);
    const userStore = useUserStore();
    const settingStore = useSettingStore();
    const formRef = ref();
    const formState = reactive({
      username: "",
      mobile: "",
      password: "",
      loginType: "password", //password
      imgCode: "",
      smsCode: ""
    });

    const rules = {
      mobile: [
        {
          required: true,
          trigger: "change",
          message: "请输入登录手机号"
        }
      ],
      username: [
        {
          required: true,
          trigger: "change",
          message: "请输入用户名"
        }
      ],
      password: [
        {
          required: true,
          trigger: "change",
          message: "请输入登录密码"
        }
      ],
      smsCode: [
        {
          required: true,
          trigger: "change",
          message: "请输入短信验证码"
        }
      ]
    };
    const layout = {
      labelCol: {
        span: 0
      },
      wrapperCol: {
        span: 24
      }
    };

    const handleFinish = async (values: any) => {
      utils.logger.log(values, formState);
      loading.value = true;
      try {
        const userInfo = await userStore.login(toRaw(formState));
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

    const imageCodeUrl = ref();
    function resetImageCode() {
      let url = "/basic/code";
      imageCodeUrl.value = url + "?t=" + new Date().getTime();
    }
    resetImageCode();

    const smsTime = ref(0);
    const smsSendBtnDisabled = computed(() => {
      if (smsTime.value === 0) {
        return false;
      }
      return !!formState.smsCode;
    });
    function sendSmsCode() {
      //api.sendSmsCode();
    }
    const sysPublicSettings = settingStore.getSysPublic;
    return {
      loading,
      formState,
      formRef,
      rules,
      layout,
      handleFinishFailed,
      handleFinish,
      resetForm,
      isLoginError,
      imageCodeUrl,
      resetImageCode,
      smsTime,
      smsSendBtnDisabled,
      sendSmsCode,
      sysPublicSettings
    };
  }
});
</script>

<style lang="less">
@import "../../../style/theme/index.less";
.user-layout-login {
  label {
    font-size: 14px;
  }

  .login-title {
    color: @primary-color;
    font-size: 18px;
    text-align: center;
    margin: 20px;
  }
  .getCaptcha {
    display: block;
    width: 100%;
    height: 40px;
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
        color: @primary-color;
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
