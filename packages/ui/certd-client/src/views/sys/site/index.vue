<template>
  <fs-page class="page-sys-site">
    <template #header>
      <div class="title">站点个性化设置</div>
    </template>
    <div class="sys-site-form">
      <a-form
        :model="formState"
        name="basic"
        :label-col="{ span: 8 }"
        :wrapper-col="{ span: 16 }"
        autocomplete="off"
        @finish="onFinish"
        @finish-failed="onFinishFailed"
      >
        <a-form-item label="标题" name="title">
          <a-input v-model:checked="formState.title" />
        </a-form-item>
        <a-form-item label="副标题" name="slogan">
          <a-input v-model:value="formState.slogan" />
        </a-form-item>
        <a-form-item label="Logo" name="logo">
          <fs-cropper-upload v-model:value="formState.logo" />
        </a-form-item>
        <a-form-item :wrapper-col="{ offset: 8, span: 16 }">
          <a-button type="primary" html-type="submit">保存</a-button>
        </a-form-item>
      </a-form>

      <!--      <a-descriptions label="系统维护操作">-->
      <!--        <a-descriptions-item label="自动化任务">-->
      <!--          <a-button @click="stopOtherUserTimer">停止所有其他用户的定时任务</a-button>-->
      <!--        </a-descriptions-item>-->
      <!--      </a-descriptions>-->
    </div>
  </fs-page>
</template>

<script setup lang="ts">
import { reactive } from "vue";
import * as api from "./api";
import { notification } from "ant-design-vue";
import { useSettingStore } from "/src/store/modules/settings";

interface FormState {
  title: string;
  slogan: string;
  logo: string;
  icpNo: string;
}

const formState = reactive<Partial<FormState>>({});

async function loadSysSiteSettings() {
  const data: any = await api.SettingsGet();
  if (data == null) {
    return;
  }
  const setting = JSON.parse(data.setting);
  Object.assign(formState, setting);
}

loadSysSiteSettings();
const settingsStore = useSettingStore();
const onFinish = async (form: any) => {
  await api.SettingsSave(form);
  await settingsStore.loadSysSettings();
  notification.success({
    message: "保存成功"
  });
};
</script>

<style lang="less">
.page-sys-site {
  .sys-site-form {
    width: 500px;
    margin: 20px;
  }
}
</style>
