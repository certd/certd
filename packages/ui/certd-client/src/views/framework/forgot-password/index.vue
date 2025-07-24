<template>
  <div class="main forgot-password-page">
    <a-form
      ref="formRef"
      class="user-layout-forgot-password"
      name="custom-validation"
      :model="formState"
      :rules="rules"
      v-bind="layout"
      :label-col="{ span: 6 }"
      @finish="handleFinish"
      @finish-failed="handleFinishFailed"
    >
      <a-tabs v-model:active-key="forgotPasswordType" :destroyInactiveTabPane="true">
        <a-tab-pane key="email" tab="邮箱找回">
          <a-form-item has-feedback name="input" label="邮箱">
            <a-input v-model:value="formState.input" placeholder="邮箱" size="large" autocomplete="off">
              <template #prefix>
                <fs-icon icon="ion:mail-outline"></fs-icon>
              </template>
            </a-input>
          </a-form-item>
          <a-form-item has-feedback name="validateCode" label="邮件验证码">
            <email-code
              v-model:value="formState.validateCode"
              :img-code="formState.imgCode"
              :email="formState.input"
              :random-str="formState.randomStr"
              verification-type="forgotPassword"
            />
          </a-form-item>
        </a-tab-pane>
        <a-tab-pane key="mobile" tab="手机号找回">
          <a-form-item required has-feedback name="input" label="手机号">
            <a-input v-model:value="formState.input" placeholder="手机号" autocomplete="off">
              <template #prefix>
                <fs-icon icon="ion:phone-portrait-outline"></fs-icon>
              </template>
            </a-input>
          </a-form-item>
          <a-form-item name="validateCode" label="手机验证码">
            <sms-code
              v-model:value="formState.validateCode"
              :img-code="formState.imgCode"
              :mobile="formState.input"
              :phone-code="formState.phoneCode"
              :random-str="formState.randomStr"
              verification-type="forgotPassword"
            />
          </a-form-item>
        </a-tab-pane>
      </a-tabs>

      <a-form-item has-feedback name="imgCode" label="图片验证码">
        <image-code ref="imageCodeRef" v-model:value="formState.imgCode" v-model:random-str="formState.randomStr"></image-code>
      </a-form-item>

      <a-form-item has-feedback name="password" label="新密码">
        <a-input-password v-model:value="formState.password" placeholder="新密码" size="large" autocomplete="off">
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
      <a-form-item>
        <a-button type="primary" size="large" html-type="submit" class="submit-button"> 找回密码</a-button>

        <div class="mt-2">
          <a href="https://certd.docmirror.cn/guide/use/forgotpasswd/" target="_blank"> 管理员无绑定通信方式或MFA丢失找回 </a>
        </div>
      </a-form-item>
    </a-form>
  </div>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref, toRaw, watch } from "vue";
import ImageCode from "/@/views/framework/login/image-code.vue";
import EmailCode from "/@/views/framework/register/email-code.vue";
import SmsCode from "/@/views/framework/login/sms-code.vue";
import { utils } from "@fast-crud/fast-crud";
import { useUserStore } from "/@/store/user";

defineOptions({
  name: "ForgotPasswordPage",
});

const rules = {
  input: [{ required: true }],
  validateCode: [{ required: true }],
  imgCode: [{ required: true }, { min: 4, max: 4, message: "请输入4位图片验证码" }],
  password: [
    { required: true, trigger: "change", message: "请输入密码" },
    { min: 6, message: "至少输入6位密码" },
  ],
  confirmPassword: [
    { required: true, trigger: "change", message: "请确认密码" },
    {
      validator: async (rule: any, value: any) => {
        if (value && value !== formState.password) {
          throw new Error("两次输入密码不一致");
        }
        return true;
      },
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

const forgotPasswordType = ref();
const userStore = useUserStore();
const formRef = ref();
const imageCodeRef = ref();

const formState: any = reactive({
  input: "",
  randomStr: "",
  imgCode: "",
  phoneCode: "86",
  validateCode: "",

  password: "",
  confirmPassword: "",
});

// TODO 这里配置不同的找回方式
onMounted(() => {
  forgotPasswordType.value = "email";
});

// 监控找回类型变化
watch(forgotPasswordType, () => {
  formState.input = "";
  formState.validateCode = "";
  imageCodeRef.value.resetImageCode();
  formRef.value.clearValidate(Object.keys(formState).filter(key => !["password", "confirmPassword"].includes(key)));
});

const handleFinish = async (values: any) => {
  await userStore.forgotPassword(
    toRaw({
      type: forgotPasswordType.value,
      input: formState.input,
      randomStr: formState.randomStr,
      imgCode: formState.imgCode,
      validateCode: formState.validateCode,
      password: formState.password,
      confirmPassword: formState.confirmPassword,
    }) as any
  );
};

const handleFinishFailed = (errors: any) => {
  utils.logger.log(errors);
};
</script>
<style scoped lang="less">
.forgot-password-page {
  .user-layout-forgot-password {
    .submit-button {
      width: 100%;
    }
  }
}
</style>
