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
        <a-form-item label="站点名称" name="title">
          <a-input v-model:value="formState.title" />
        </a-form-item>
        <a-form-item label="副标题/口号" name="slogan">
          <a-input v-model:value="formState.slogan" />
        </a-form-item>
        <a-form-item label="Logo" name="logo">
          <fs-cropper-uploader
            v-model:model-value="formState.logo"
            :cropper="cropperOptions"
            value-type="key"
            :uploader="uploaderConfig"
            :build-url="buildUrl"
          />
        </a-form-item>
        <a-form-item label="登录页Logo" name="loginLogo">
          <fs-cropper-uploader
            v-model:model-value="formState.loginLogo"
            :cropper="loginLogoCropperOptions"
            value-type="key"
            :uploader="uploaderConfig"
            :build-url="buildUrl"
          />
        </a-form-item>
        <a-form-item label="关闭首页告警" name="warningOff">
          <a-switch v-model:checked="formState.warningOff" />
        </a-form-item>
        <a-form-item label="你的主体名称" name="licenseTo">
          <a-input v-model:value="formState.licenseTo" />
          <div class="helper">将会显示在底部</div>
        </a-form-item>
        <a-form-item label="你的主体URL" name="licenseToUrl">
          <a-input v-model:value="formState.licenseToUrl" />
        </a-form-item>
        <a-form-item :wrapper-col="{ offset: 8, span: 16 }">
          <a-button :loading="saveLoading" type="primary" html-type="submit">保存</a-button>
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
import { reactive, ref } from "vue";
import * as api from "./api";
import { notification } from "ant-design-vue";
import { useSettingStore } from "/src/store/modules/settings";
import { useUserStore } from "/@/store/modules/user";

defineOptions({
  name: "SiteSetting"
});

interface FormState {
  title: string;
  slogan: string;
  logo: string;
  loginLogo: string;
  warningOff: boolean;
  licenseTo: string;
  licenseToUrl: string;
}

const formState = reactive<Partial<FormState>>({});

async function loadSysSiteSettings() {
  const data: any = await api.SettingsGet();
  if (data == null) {
    return;
  }
  Object.assign(formState, data);
}
const saveLoading = ref(false);
loadSysSiteSettings();
const settingsStore = useSettingStore();
const onFinish = async (form: any) => {
  saveLoading.value = true;
  try {
    await api.SettingsSave(form);
    await loadSysSiteSettings();
    await settingsStore.loadSysSettings();
    notification.success({
      message: "保存成功"
    });
  } finally {
    saveLoading.value = false;
  }
};

const userStore = useUserStore();
const uploaderConfig = ref({
  type: "form",
  action: "/basic/file/upload",
  name: "file",
  headers: {
    Authorization: "Bearer " + userStore.getToken
  },
  successHandle(res: any) {
    return res;
  }
});

function buildUrl(key: string) {
  return `/api/basic/file/download?&key=` + key;
}

function onFinishFailed(err) {
  console.log(err);
}

const cropperOptions = ref({
  aspectRatio: 1,
  autoCropArea: 1,
  viewMode: 0
});
const loginLogoCropperOptions = ref({
  aspectRatio: 3,
  autoCropArea: 1,
  viewMode: 0
});
</script>

<style lang="less">
.page-sys-site {
  .sys-site-form {
    width: 500px;
    margin: 20px;
  }
}
.fs-cropper-dialog__preview img {
  border-radius: 0 !important;
  margin-top: 0 !important;
}
</style>
