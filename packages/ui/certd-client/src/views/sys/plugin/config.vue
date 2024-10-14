<template>
  <fs-page class="page-plugin-config">
    <template #header>
      <div class="title">证书插件配置</div>
    </template>

    <div class="sys-plugin-config settings-form">
      <a-form :model="formState" :label-col="{ span: 8 }" :wrapper-col="{ span: 16 }" autocomplete="off" @finish="onFinish" @finish-failed="onFinishFailed">
        <a-form-item label="公共Google EAB授权" :name="['CertApply', 'sysSetting', 'input', 'googleCommonEabAccessId']">
          <access-selector v-model:model-value="formState.CertApply.sysSetting.input.googleCommonEabAccessId" type="eab" from="sys"></access-selector>
          <div class="helper">
            <div>设置公共Google EAB授权给用户使用，避免用户自己去翻墙获取Google EAB授权</div>
            <div>
              <a href="https://gitee.com/certd/certd/blob/v2/doc/google/google.md#21-%E7%9B%B4%E6%8E%A5%E8%8E%B7%E5%8F%96eab-%E6%8E%A8%E8%8D%90">
                获取Google EAB授权方法
              </a>
            </div>
          </div>
        </a-form-item>

        <a-form-item :wrapper-col="{ offset: 8, span: 16 }">
          <a-button :loading="saveLoading" type="primary" html-type="submit">保存</a-button>
        </a-form-item>
      </a-form>
    </div>
  </fs-page>
</template>

<script lang="ts" setup>
import AccessSelector from "/@/views/certd/access/access-selector/index.vue";
import { reactive, ref } from "vue";
import { CommPluginConfig, GetCommPluginConfigs, SaveCommPluginConfigs } from "/@/views/sys/plugin/api";
import { merge } from "lodash-es";
import { notification } from "ant-design-vue";

defineOptions({
  name: "SysPluginConfig"
});
const formState = reactive<Partial<CommPluginConfig>>({
  CertApply: {
    sysSetting: {
      input: {
        googleCommonEabAccessId: null
      }
    }
  }
});

async function loadForm() {
  const res = await GetCommPluginConfigs();
  merge(formState, res);
}

loadForm();

const saveLoading = ref(false);
const onFinish = async (form: any) => {
  try {
    saveLoading.value = true;
    await SaveCommPluginConfigs(form);
    notification.success({
      message: "保存成功"
    });
  } finally {
    saveLoading.value = false;
  }
};

const onFinishFailed = (errorInfo: any) => {
  console.log("Failed:", errorInfo);
};
</script>
<style lang="less"></style>
