<template>
  <div class="sys-settings-form sys-settings-base">
    <a-form :model="formState" name="basic" :label-col="{ span: 8 }" :wrapper-col="{ span: 16 }" autocomplete="off" @finish="onFinish">
      <a-form-item :label="t('certd.icpRegistrationNumber')" :name="['public', 'icpNo']">
        <a-input v-model:value="formState.public.icpNo" :placeholder="t('certd.icpPlaceholder')" />
      </a-form-item>
      <a-form-item :label="t('certd.publicSecurityRegistrationNumber')" :name="['public', 'mpsNo']">
        <a-input v-model:value="formState.public.mpsNo" :placeholder="t('certd.publicSecurityPlaceholder')" />
      </a-form-item>

      <a-form-item :label="t('certd.enableAssistant')" :name="['public', 'aiChatEnabled']">
        <a-switch v-model:checked="formState.public.aiChatEnabled" />
      </a-form-item>
      <a-form-item :label="t('certd.allowCrawlers')" :name="['public', 'robots']">
        <a-switch v-model:checked="formState.public.robots" />
      </a-form-item>

      <a-form-item :label="t('certd.enableCommonCnameService')" :name="['private', 'commonCnameEnabled']">
        <a-switch v-model:checked="formState.private.commonCnameEnabled" />
        <div class="helper" v-html="t('certd.commonCnameHelper')"></div>
      </a-form-item>

      <a-form-item :label="t('certd.sys.setting.notice')" :name="['public', 'notice']">
        <a-textarea v-model:value="formState.public.notice" :placeholder="t('certd.sys.setting.noticePlaceholder')" :rows="3" />
        <div class="helper" v-html="t('certd.sys.setting.noticeHelper')"></div>
      </a-form-item>

      <a-form-item :label="t('certd.sys.setting.customFooter')" :name="['public', 'customFooter']">
        <a-textarea v-model:value="formState.public.customFooter" :disabled="!settingsStore.isPlus" :placeholder="t('certd.sys.setting.customFooterPlaceholder')" :rows="3" />
        <div class="helper" v-html="t('certd.sys.setting.customFooterHelper')"></div>
        <vip-button class="ml-5 justify-start" mode="button"></vip-button>
      </a-form-item>

      <a-form-item :label="t('certd.sys.setting.bindUrl')">
        <a-button class="ml-2" type="primary" @click="settingsStore.openBindUrlModal({ closable: true })">{{ t("certd.sys.setting.bindUrl") }}</a-button>
        <div class="helper" v-html="t('certd.sys.setting.bindUrlHelper')"></div>
      </a-form-item>

      <a-form-item label=" " :colon="false" :wrapper-col="{ span: 8 }">
        <a-button :loading="saveLoading" type="primary" html-type="submit">{{ t("certd.saveButton") }}</a-button>
      </a-form-item>
    </a-form>
  </div>
</template>

<script setup lang="tsx">
import { notification } from "ant-design-vue";
import { merge } from "lodash-es";
import { reactive, ref } from "vue";
import { useSettingStore } from "/@/store/settings";
import * as api from "/@/views/sys/settings/api";
import { SysSettings } from "/@/views/sys/settings/api";

import { useI18n } from "/src/locales";
const { t } = useI18n();

defineOptions({
  name: "SettingBase",
});

const formState = reactive<Partial<SysSettings>>({
  public: {
    icpNo: "",
    mpsNo: "",
  },
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
<style lang="less">
.sys-settings-base {
}
</style>
