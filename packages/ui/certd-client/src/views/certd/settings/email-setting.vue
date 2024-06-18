<template>
  <fs-page class="page-setting-email">
    <template #header>
      <div class="title">邮件设置</div>
    </template>
    <div class="email-form">
      <a-form :model="formState" name="basic" :label-col="{ span: 8 }" :wrapper-col="{ span: 16 }" autocomplete="off" @finish="onFinish" @finish-failed="onFinishFailed">
        <a-form-item label="SMTP域名" name="host" :rules="[{ required: true, message: '请输入smtp域名或ip' }]">
          <a-input v-model:value="formState.host" />
        </a-form-item>

        <a-form-item label="SMTP端口" name="port" :rules="[{ required: true, message: '请输入smtp端口号' }]">
          <a-input v-model:value="formState.port" />
        </a-form-item>

        <a-form-item label="用户名" :name="['auth', 'user']" :rules="[{ required: true, message: '请输入用户名' }]">
          <a-input v-model:value="formState.auth.user" />
        </a-form-item>
        <a-form-item label="密码" :name="['auth', 'pass']" :rules="[{ required: true, message: '请输入密码' }]">
          <a-input-password v-model:value="formState.auth.pass" />
        </a-form-item>
        <a-form-item label="发件邮箱" name="sender" :rules="[{ required: true, message: '请输入发件邮箱' }]">
          <a-input v-model:value="formState.sender" />
        </a-form-item>
        <a-form-item label="是否ssl" name="secure">
          <a-switch v-model:checked="formState.secure" />
        </a-form-item>
        <a-form-item label="忽略证书校验" name="tls.rejectUnauthorized">
          <a-switch v-model:checked="formState.tls.rejectUnauthorized" />
        </a-form-item>
        <a-form-item :wrapper-col="{ offset: 8, span: 16 }">
          <a-button type="primary" html-type="submit">保存</a-button>
        </a-form-item>
      </a-form>
      <div>
        <a-form :model="testFormState" name="basic" :label-col="{ span: 8 }" :wrapper-col="{ span: 16 }" autocomplete="off" @finish="onTestSend">
          <a-form-item label="测试收件邮箱" name="receiver" :rules="[{ required: true, message: '请输入测试收件邮箱' }]">
            <a-input v-model:value="testFormState.receiver" />
          </a-form-item>
          <a-form-item :wrapper-col="{ offset: 8, span: 16 }">
            <a-button type="primary" html-type="submit">测试</a-button>
          </a-form-item>
        </a-form>
      </div>
    </div>
  </fs-page>
</template>

<script setup lang="ts">
import { reactive } from "vue";
import * as api from "./api";
import * as emailApi from "./api.email";

import { SettingKeys } from "./api";
import { notification } from "ant-design-vue";

interface FormState {
  host: string;
  port: number;
  auth: {
    user: string;
    pass: string;
  };
  secure: boolean; // use TLS
  tls: {
    // do not fail on invalid certs
    rejectUnauthorized?: boolean;
  };
  sender: string;
}

const formState = reactive<Partial<FormState>>({
  auth: {
    user: "",
    pass: ""
  },
  tls: {}
});

async function load() {
  const data: any = await api.SettingsGet(SettingKeys.Email);
  const setting = JSON.parse(data.setting);
  Object.assign(formState, setting);
}

load();

const onFinish = async (form: any) => {
  console.log("Success:", form);
  await api.SettingsSave(SettingKeys.Email, form);
  notification.success({
    message: "保存成功"
  });
};

const onFinishFailed = (errorInfo: any) => {
  // console.log("Failed:", errorInfo);
};

interface TestFormState {
  receiver: string;
  loading: boolean;
}
const testFormState = reactive<TestFormState>({
  receiver: "",
  loading: false
});
async function onTestSend() {
  testFormState.loading = true;
  try {
    await emailApi.TestSend(testFormState.receiver);
    notification.success({
      message: "发送成功"
    });
  } finally {
    testFormState.loading = false;
  }
}
</script>

<style lang="less">
.page-setting-email {
  .email-form {
    width: 500px;
    margin: 20px;
  }
}
</style>
