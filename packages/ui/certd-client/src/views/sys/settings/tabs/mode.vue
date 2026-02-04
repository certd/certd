<template>
  <div class="sys-settings-form sys-settings-mode">
    <a-form :model="formState" name="basic" :label-col="{ span: 8 }" :wrapper-col="{ span: 16 }" autocomplete="off" @finish="onFinish">
      <a-form-item :label="t('certd.adminMode')" :name="['public', 'adminMode']">
        <fs-dict-radio v-model:checked="formState.public.adminMode" :dict="adminModeDict" />
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
const { t } = useI18n();

defineOptions({
  name: "SettingMode",
});

const adminModeDict = [
  {
    label: t("certd.adminMode.enterpriseMode"),
    value: "enterprise",
  },
  {
    label: t("certd.adminMode.saasMode"),
    value: "saas",
  },
];

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
const onFinish = async (form: any) => {
  try {
    saveLoading.value = true;

    await api.SysSettingsSave(form);
    await settingsStore.loadSysSettings();
    notification.success({
      message: t("certd.saveSuccess"),
    });
  } finally {
    saveLoading.value = false;
  }
};
</script>
<style lang="less"></style>
