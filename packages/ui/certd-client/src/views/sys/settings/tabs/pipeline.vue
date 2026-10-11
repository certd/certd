<template>
  <div class="sys-settings-form sys-settings-pipeline">
    <a-form :model="formState" name="basic" :label-col="{ span: 8 }" :wrapper-col="{ span: 16 }" autocomplete="off" @finish="onFinish">
      <a-form-item :label="t('certd.sys.settings.manageOtherUserPipeline')" :name="['public', 'managerOtherUserPipeline']">
        <a-switch v-model:checked="formState.public.managerOtherUserPipeline" />
      </a-form-item>
      <a-form-item :label="t('certd.sys.settings.limitUserPipelineCount')" :name="['public', 'limitUserPipelineCount']">
        <a-input-number v-model:value="formState.public.limitUserPipelineCount" />
        <div class="helper">{{ t("certd.sys.settings.limitUserPipelineCountHelper") }}</div>
      </a-form-item>
      <a-form-item :label="t('certd.sys.settings.showRunStrategy')" :name="['public', 'showRunStrategy']">
        <a-switch v-model:checked="formState.public.showRunStrategy" />
        <div class="helper">{{ t("certd.sys.settings.showRunStrategyHelper") }}</div>
      </a-form-item>
      <a-form-item :label="t('certd.sys.settings.pipelineValidTimeEnabled')" :name="['public', 'pipelineValidTimeEnabled']">
        <div class="flex items-center">
          <a-switch v-model:checked="formState.public.pipelineValidTimeEnabled" :disabled="!settingsStore.isPlus" />
          <vip-button class="ml-5" mode="button"></vip-button>
        </div>

        <div class="helper">{{ t("certd.sys.settings.pipelineValidTimeEnabledHelper") }}</div>
      </a-form-item>
      <a-form-item :label="t('certd.sys.settings.certDomainAddToMonitorEnabled')" :name="['public', 'certDomainAddToMonitorEnabled']">
        <div class="flex items-center">
          <a-switch v-model:checked="formState.public.certDomainAddToMonitorEnabled" :disabled="!settingsStore.isPlus" />
          <vip-button class="ml-5" mode="button"></vip-button>
        </div>
        <div class="helper">
          {{ t("certd.sys.settings.certDomainAddToMonitorEnabledHelper") }}
          <a href="https://certd.docmirror.cn/guide/use/setting/user-valid.html" target="_blank">{{ t("certd.common.helpDocLink") }}</a>
        </div>
      </a-form-item>

      <a-form-item :label="t('certd.sys.settings.fixedCertExpireDays')" :name="['public', 'fixedCertExpireDays']">
        <div class="flex items-center">
          <a-input-number v-model:value="formState.public.fixedCertExpireDays" :disabled="!settingsStore.isPlus" :placeholder="t('certd.sys.settings.fixedCertExpireDaysRecommend')" />
          <vip-button class="ml-5" mode="button"></vip-button>
        </div>
        <div class="helper">{{ t("certd.sys.settings.fixedCertExpireDaysHelper") }}</div>
      </a-form-item>

      <a-form-item :label="t('certd.sys.settings.defaultCertRenewDays')" :name="['public', 'defaultCertRenewDays']">
        <div class="flex items-center">
          <a-input-number v-model:value="formState.public.defaultCertRenewDays" :placeholder="t('certd.sys.settings.defaultCertRenewDaysRecommend')" />
        </div>
        <div class="helper">{{ t("certd.sys.settings.defaultCertRenewDaysHelper") }}</div>
      </a-form-item>

      <a-form-item :label="t('certd.sys.settings.pipelineMaxRunningCount')" :name="['private', 'pipelineMaxRunningCount']">
        <div class="flex items-center">
          <a-input-number v-model:value="formState.private.pipelineMaxRunningCount" :placeholder="t('certd.sys.settings.pipelineMaxRunningCountRecommend')" />
        </div>
        <div class="helper">{{ t("certd.sys.settings.pipelineMaxRunningCountHelper") }}</div>
      </a-form-item>

      <a-form-item :label="t('certd.sys.settings.acmeWalkFromAuthoritative')" :name="['private', 'acmeWalkFromAuthoritative']">
        <div class="flex items-center">
          <a-switch v-model:checked="formState.private.acmeWalkFromAuthoritative" />
        </div>
        <div class="helper">{{ t("certd.sys.settings.acmeWalkFromAuthoritativeHelper") }}</div>
      </a-form-item>

      <a-form-item :label="t('certd.sys.settings.customAcmeManage')" :name="['private', 'customAcmeProviders']">
        <div class="w-full">
          <div class="helper">{{ t("certd.sys.settings.customAcmeManageHelper") }}</div>
          <custom-acme-provider-list v-model="formState.private.customAcmeProviders" />
        </div>
      </a-form-item>

      <a-form-item label=" " :colon="false" :wrapper-col="{ span: 8 }">
        <a-button :loading="saveLoading" type="primary" html-type="submit">{{ t("certd.sys.settings.saveButton") }}</a-button>
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
import CustomAcmeProviderList from "/@/views/sys/settings/components/custom-acme-provider-list.vue";
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
    customAcmeProviders: [],
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
      message: t("certd.common.saveSuccess"),
    });
  } finally {
    saveLoading.value = false;
  }
};
</script>
<style lang="less"></style>
