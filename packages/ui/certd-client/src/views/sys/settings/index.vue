<template>
  <fs-page class="page-sys-settings">
    <template #header>
      <div class="title">系统设置</div>
    </template>
    <div class="sys-settings-form settings-form">
      <a-form
        :model="formState"
        name="basic"
        :label-col="{ span: 8 }"
        :wrapper-col="{ span: 16 }"
        autocomplete="off"
        @finish="onFinish"
        @finish-failed="onFinishFailed"
      >
        <a-form-item label="开启自助注册" :name="['public', 'registerEnabled']">
          <a-switch v-model:checked="formState.public.registerEnabled" />
        </a-form-item>
        <a-form-item label="管理其他用户流水线" :name="['public', 'managerOtherUserPipeline']">
          <a-switch v-model:checked="formState.public.managerOtherUserPipeline" />
        </a-form-item>
        <a-form-item label="ICP备案号" :name="['public', 'icpNo']">
          <a-input v-model:value="formState.public.icpNo" placeholder="粤ICP备xxxxxxx号" />
        </a-form-item>

        <a-form-item label="HTTP代理" :name="['private', 'httpProxy']" :rules="urlRules">
          <a-input v-model:value="formState.private.httpProxy" placeholder="http://192.168.1.2:18010/" />
        </a-form-item>

        <a-form-item label="HTTPS代理" :name="['private', 'httpsProxy']" :rules="urlRules">
          <div class="flex">
            <a-input v-model:value="formState.private.httpsProxy" placeholder="http://192.168.1.2:18010/" />
            <a-button class="ml-5" type="primary" title="保存后，再点击测试" @click="testProxy">测试</a-button>
          </div>
          <div class="helper">一般这两个代理填一样的</div>
        </a-form-item>
        <a-form-item :wrapper-col="{ offset: 8, span: 16 }">
          <a-button :loading="saveLoading" type="primary" html-type="submit">保存</a-button>
        </a-form-item>
      </a-form>
    </div>
  </fs-page>
</template>

<script setup lang="ts">
import { reactive, ref } from "vue";
import * as api from "./api";
import { SysSettings } from "./api";
import { notification } from "ant-design-vue";
import { useSettingStore } from "/@/store/modules/settings";
import { merge } from "lodash-es";

defineOptions({
  name: "SysSettings"
});

const formState = reactive<Partial<SysSettings>>({
  public: {
    registerEnabled: false,
    managerOtherUserPipeline: false,
    icpNo: ""
  },
  private: {}
});

const urlRules = ref({
  type: "url",
  message: "请输入正确的URL"
});

async function loadSysSettings() {
  const data: any = await api.SysSettingsGet();
  merge(formState, data);
}

const saveLoading = ref(false);
loadSysSettings();
const settingsStore = useSettingStore();
const onFinish = async (form: any) => {
  try {
    saveLoading.value = true;
    await api.SysSettingsSave(form);
    await settingsStore.loadSysSettings();
    notification.success({
      message: "保存成功"
    });
  } finally {
    saveLoading.value = false;
  }
};

const onFinishFailed = (errorInfo: any) => {
  // console.log("Failed:", errorInfo);
};

async function stopOtherUserTimer() {
  await api.stopOtherUserTimer();
  notification.success({
    message: "停止成功"
  });
}

async function testProxy() {
  const res = await api.TestProxy();
  const content = `测试google:${res.google === true ? "成功" : "失败" + res.google}，测试百度:${res.baidu === true ? "成功" : "失败:" + res.baidu}`;
  notification.success({
    message: "测试完成",
    description: content
  });
}
</script>

<style lang="less">
.page-sys-settings {
  .sys-settings-form {
    width: 500px;
    margin: 20px;
  }
}
</style>
