<template>
  <fs-page class="page-sys-settings">
    <template #header>
      <div class="title">系统设置</div>
    </template>
    <div class="sys-settings-form">
      <a-form :model="formState" name="basic" :label-col="{ span: 8 }" :wrapper-col="{ span: 16 }" autocomplete="off" @finish="onFinish" @finish-failed="onFinishFailed">
        <a-form-item label="开启自助注册" name="registerEnabled">
          <a-switch v-model:checked="formState.registerEnabled" />
        </a-form-item>
        <a-form-item :wrapper-col="{ offset: 8, span: 16 }">
          <a-button type="primary" html-type="submit">保存</a-button>
        </a-form-item>
      </a-form>
    </div>
  </fs-page>
</template>

<script setup lang="ts">
import { reactive } from "vue";
import * as api from "./api";
import { PublicSettingsSave, SettingKeys } from "./api";
import { notification } from "ant-design-vue";
import { useSettingStore } from "/@/store/modules/settings";

interface FormState {
  registerEnabled: boolean;

}

const formState = reactive<Partial<FormState>>({
  registerEnabled:false
});

async function loadSysPublicSettings() {
  const data: any = await api.SettingsGet(SettingKeys.SysPublic);
  const setting = JSON.parse(data.setting);
  Object.assign(formState, setting);
}

loadSysPublicSettings();
const settingsStore= useSettingStore()
const onFinish = async (form: any) => {
  console.log("Success:", form);
  await api.PublicSettingsSave(form);
  await settingsStore.loadSysSettings()
  notification.success({
    message: "保存成功"
  });
};

const onFinishFailed = (errorInfo: any) => {
  // console.log("Failed:", errorInfo);
};

</script>

<style lang="less">
.page-sys-settings {
  .sys-settings-form {
    width: 500px;
    margin: 20px;
  }
}
</style>
