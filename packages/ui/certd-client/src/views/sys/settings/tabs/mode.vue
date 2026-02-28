<template>
  <div class="sys-settings-form sys-settings-mode">
    <a-form :model="formState" name="basic" :label-col="{ span: 8 }" :wrapper-col="{ span: 16 }" autocomplete="off" @finish="onFinish">
      <a-form-item :label="t('certd.sys.setting.adminMode')" :name="['public', 'adminMode']">
        <div class="w-full flex items-center">
          <fs-dict-radio v-model:value="formState.public.adminMode" :disabled="!settingsStore.isPlus" :dict="adminModeDict" />
          <vip-button class="ml-5" mode="button"></vip-button>
        </div>
        <div class="intro-desc helper">SaaS模式：每个用户管理自己的流水线和授权资源，独立使用。</div>
        <div class="intro-desc helper">企业模式：企业内部员工使用，通过项目合作管理流水线证书和授权资源。</div>
      </a-form-item>

      <a-form-item label=" " :colon="false" :wrapper-col="{ span: 8 }">
        <a-button :loading="saveLoading" type="primary" html-type="submit">{{ t("certd.saveButton") }}</a-button>
      </a-form-item>
    </a-form>
  </div>
</template>

<script setup lang="tsx">
import { reactive, ref } from "vue";
import { SysSettings } from "/@/views/sys/settings/api";
import * as api from "/@/views/sys/settings/api";
import { merge } from "lodash-es";
import { useSettingStore } from "/@/store/settings";
import { notification } from "ant-design-vue";
import { useI18n } from "/src/locales";
import { dict } from "@fast-crud/fast-crud";
import { useProjectStore } from "/@/store/project";
const { t } = useI18n();

defineOptions({
  name: "SettingMode",
});

const adminModeDict = dict({
  data: [
    {
      label: t("certd.sys.setting.saasMode"),
      value: "saas",
    },
    {
      label: t("certd.sys.setting.enterpriseMode"),
      value: "enterprise",
    },
  ],
});

const formState = reactive<Partial<SysSettings>>({
  public: {},
  private: {},
});

async function loadSysSettings() {
  const data: any = await api.SysSettingsGet();
  merge(formState, data);
}

const saveLoading = ref(false);
loadSysSettings();
const settingsStore = useSettingStore();
const projectStore = useProjectStore();
const onFinish = async (form: any) => {
  try {
    saveLoading.value = true;

    await api.SysSettingsSave(form);
    await settingsStore.loadSysSettings();
    await projectStore.reload();
    notification.success({
      message: t("certd.saveSuccess"),
    });
  } finally {
    saveLoading.value = false;
  }
};
</script>
<style lang="less"></style>
