<template>
  <div class="sys-settings-form sys-settings-pipeline">
    <a-form :model="formState" name="basic" :label-col="{ span: 8 }" :wrapper-col="{ span: 16 }" autocomplete="off" @finish="onFinish">
      <a-form-item :label="t('certd.manageOtherUserPipeline')" :name="['public', 'managerOtherUserPipeline']">
        <a-switch v-model:checked="formState.public.managerOtherUserPipeline" />
      </a-form-item>
      <a-form-item :label="t('certd.limitUserPipelineCount')" :name="['public', 'limitUserPipelineCount']">
        <a-input-number v-model:value="formState.public.limitUserPipelineCount" />
        <div class="helper">{{ t("certd.limitUserPipelineCountHelper") }}</div>
      </a-form-item>
      <a-form-item :label="t('certd.sys.setting.showRunStrategy')" :name="['public', 'showRunStrategy']">
        <a-switch v-model:checked="formState.public.showRunStrategy" />
        <div class="helper">{{ t("certd.sys.setting.showRunStrategyHelper") }}</div>
      </a-form-item>
      <a-form-item :label="t('certd.sys.setting.pipelineValidTimeEnabled')" :name="['public', 'pipelineValidTimeEnabled']">
        <div class="flex items-center">
          <a-switch v-model:checked="formState.public.pipelineValidTimeEnabled" :disabled="!settingsStore.isPlus" />
          <vip-button class="ml-5" mode="button"></vip-button>
        </div>

        <div class="helper">{{ t("certd.sys.setting.pipelineValidTimeEnabledHelper") }}</div>
      </a-form-item>
      <a-form-item :label="t('certd.sys.setting.certDomainAddToMonitorEnabled')" :name="['public', 'certDomainAddToMonitorEnabled']">
        <div class="flex items-center">
          <a-switch v-model:checked="formState.public.certDomainAddToMonitorEnabled" :disabled="!settingsStore.isPlus" />
          <vip-button class="ml-5" mode="button"></vip-button>
        </div>
        <div class="helper">
          {{ t("certd.sys.setting.certDomainAddToMonitorEnabledHelper") }}
          <a href="https://certd.docmirror.cn/guide/use/setting/user-valid.html" target="_blank">{{ t("certd.helpDocLink") }}</a>
        </div>
      </a-form-item>

      <a-form-item :label="t('certd.sys.setting.fixedCertExpireDays')" :name="['public', 'fixedCertExpireDays']">
        <div class="flex items-center">
          <a-input-number v-model:value="formState.public.fixedCertExpireDays" :disabled="!settingsStore.isPlus" :placeholder="t('certd.sys.setting.fixedCertExpireDaysRecommend')" />
          <vip-button class="ml-5" mode="button"></vip-button>
        </div>
        <div class="helper">{{ t("certd.sys.setting.fixedCertExpireDaysHelper") }}</div>
      </a-form-item>

      <a-form-item :label="t('certd.sys.setting.defaultCertRenewDays')" :name="['public', 'defaultCertRenewDays']">
        <div class="flex items-center">
          <a-input-number v-model:value="formState.public.defaultCertRenewDays" :placeholder="t('certd.sys.setting.defaultCertRenewDaysRecommend')" />
        </div>
        <div class="helper">{{ t("certd.sys.setting.defaultCertRenewDaysHelper") }}</div>
      </a-form-item>

      <a-form-item :label="t('certd.sys.setting.pipelineMaxRunningCount')" :name="['private', 'pipelineMaxRunningCount']">
        <div class="flex items-center">
          <a-input-number v-model:value="formState.private.pipelineMaxRunningCount" :placeholder="t('certd.sys.setting.pipelineMaxRunningCountRecommend')" />
        </div>
        <div class="helper">{{ t("certd.sys.setting.pipelineMaxRunningCountHelper") }}</div>
      </a-form-item>

      <a-form-item :label="t('certd.sys.setting.acmeWalkFromAuthoritative')" :name="['private', 'acmeWalkFromAuthoritative']">
        <div class="flex items-center">
          <a-switch v-model:checked="formState.private.acmeWalkFromAuthoritative" />
        </div>
        <div class="helper">{{ t("certd.sys.setting.acmeWalkFromAuthoritativeHelper") }}</div>
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
  name: "SettingPipeline",
});

const formState = reactive<Partial<SysSettings>>({
  public: {},
  private: {
    acmeWalkFromAuthoritative: true,
  },
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
