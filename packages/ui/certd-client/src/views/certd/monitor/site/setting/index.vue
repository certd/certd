<template>
  <fs-page class="page-user-settings page-site-monitor-setting">
    <template #header>
      <div class="title">{{ t("certd.monitor.setting.siteMonitorSettings") }}</div>
    </template>
    <div class="user-settings-form settings-form">
      <a-form :model="formState" name="basic" :label-col="{ span: 8 }" :wrapper-col="{ span: 16 }" autocomplete="off">
        <a-form-item :label="t('certd.monitor.setting.notificationChannel')" :name="['notificationId']">
          <div class="flex">
            <NotificationSelector v-model="formState.notificationId" />
          </div>
          <div class="helper">{{ t("certd.monitor.setting.setNotificationChannel") }}</div>
        </a-form-item>
        <a-form-item :label="t('certd.monitor.setting.retryTimes')" :name="['retryTimes']">
          <div class="flex">
            <a-input-number v-model:value="formState.retryTimes" />
          </div>
          <div class="helper">{{ t("certd.monitor.setting.monitorRetryTimes") }}</div>
        </a-form-item>
        <a-form-item :label="t('certd.monitor.setting.certValidDays')" :name="['certValidDays']">
          <div class="flex">
            <a-input-number v-model:value="formState.certValidDays" />
          </div>
          <div class="helper">{{ t("certd.monitor.setting.certValidDaysHelper") }}</div>
        </a-form-item>
        <a-form-item :label="t('certd.monitor.setting.dnsServer')" :name="['dnsServer']">
          <div class="flex">
            <a-select v-model:value="formState.dnsServer" :token-separators="[' ', ',', '，', '、', '|']" mode="tags" :open="false" />
          </div>
          <div class="helper">{{ t("certd.monitor.setting.dnsServerHelper") }}</div>
        </a-form-item>
        <a-form-item :label="t('certd.monitor.setting.monitorCronSetting')" :name="['cron']">
          <div class="flex flex-baseline">
            <cron-editor v-model="formState.cron" :disabled="!settingsStore.isPlus" :allow-every-min="userStore.isAdmin" />
            <vip-button class="ml-5" mode="button"></vip-button>
          </div>
          <div class="helper">{{ t("certd.monitor.setting.cronTrigger") }}</div>
        </a-form-item>
        <a-form-item label=" " :colon="false" :wrapper-col="{ span: 16 }">
          <loading-button type="primary" html-type="button" :click="doSave">{{ t("certd.save") }}</loading-button>
        </a-form-item>
      </a-form>
    </div>
  </fs-page>
</template>

<script setup lang="tsx">
import { notification } from "ant-design-vue";
import { merge } from "lodash-es";
import { reactive } from "vue";
import * as api from "./api";
import { UserSiteMonitorSetting } from "./api";
import { useUserStore } from "/@/store/user";
import { utils } from "/@/utils";
import NotificationSelector from "/@/views/certd/notification/notification-selector/index.vue";
import { useI18n } from "/src/locales";
import { useSettingStore } from "/src/store/settings";

const { t } = useI18n();

const settingsStore = useSettingStore();
const userStore = useUserStore();
defineOptions({
  name: "UserSecurity",
});

const formState = reactive<Partial<UserSiteMonitorSetting>>({
  notificationId: 0,
});

async function loadUserSettings() {
  const data: any = await api.SiteMonitorSettingsGet();
  merge(formState, data);
}

loadUserSettings();
const doSave = async (form: any) => {
  await utils.sleep(1);
  await api.SiteMonitorSettingsSave({
    ...formState,
  });
  notification.success({
    message: t("certd.saveSuccess"),
  });
};
</script>

<style lang="less">
.page-user-settings {
  .user-settings-form {
    width: 700px;
    margin: 20px;
  }
}
</style>
