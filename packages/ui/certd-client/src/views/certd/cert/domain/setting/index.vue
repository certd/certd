<template>
  <fs-page class="page-user-settings page-domain-monitor-setting">
    <template #header>
      <div class="title">{{ t("monitor.setting.domain.monitorSettings") }}</div>
    </template>
    <div class="user-settings-form settings-form">
      <a-form :model="formState" name="basic" :label-col="{ span: 8 }" :wrapper-col="{ span: 16 }" autocomplete="off">
        <a-form-item :label="t('monitor.setting.domain.enabled')" :name="['enabled']">
          <div class="flex flex-baseline">
            <a-switch v-model:checked="formState.enabled" :disabled="!settingsStore.isPlus" />
            <vip-button class="ml-5" mode="button"></vip-button>
          </div>
          <div class="helper">{{ t("monitor.setting.domain.enabledHelper") }}</div>
        </a-form-item>
        <a-form-item v-if="formState.enabled" :label="t('monitor.setting.domain.notificationChannel')" :name="['notificationId']">
          <div class="flex">
            <NotificationSelector v-model="formState.notificationId" />
          </div>
          <div class="helper">{{ t("monitor.setting.domain.setNotificationChannel") }}</div>
        </a-form-item>
        <a-form-item v-if="formState.enabled" :label="t('monitor.setting.domain.willExpireDays')" :name="['willExpireDays']">
          <div class="flex">
            <a-input-number v-model:value="formState.willExpireDays" />
          </div>
          <div class="helper">{{ t("monitor.setting.domain.willExpireDaysHelper") }}</div>
        </a-form-item>
        <a-form-item v-if="formState.enabled" :label="t('monitor.setting.domain.monitorCronSetting')" :name="['cron']">
          <div class="flex flex-baseline">
            <cron-editor v-model="formState.cron" :disabled="!settingsStore.isPlus" :allow-every-min="userStore.isAdmin" />
            <vip-button class="ml-5" mode="button"></vip-button>
          </div>
          <div class="helper">{{ t("monitor.setting.domain.cronTrigger") }}</div>
        </a-form-item>
        <a-form-item label=" " :colon="false" :wrapper-col="{ span: 16 }">
          <loading-button type="primary" html-type="button" :click="doSave" :disabled="!hasActionPermission('write')">{{ t("certd.save") }}</loading-button>
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
import { UserDomainMonitorSetting } from "./api";
import { useUserStore } from "/@/store/user";
import { utils } from "/@/utils";
import NotificationSelector from "/@/views/certd/notification/notification-selector/index.vue";
import { useI18n } from "/src/locales";
import { useSettingStore } from "/src/store/settings";
import { useCrudPermission } from "/@/plugin/permission";

const { t } = useI18n();

const settingsStore = useSettingStore();
const userStore = useUserStore();
defineOptions({
  name: "DomainMonitorSetting",
});

const randomHour = Math.floor(Math.random() * 9);
const randomMin = Math.floor(Math.random() * 59);
const randomCron = `0 ${randomMin} ${randomHour} * * *`;

const formState = reactive<Partial<UserDomainMonitorSetting>>({
  enabled: false,
  notificationId: 0,
  cron: randomCron,
  willExpireDays: 30,
});

async function loadUserSettings() {
  const data: any = await api.DomainMonitorSettingsGet();
  merge(formState, data);
}

const { hasActionPermission } = useCrudPermission({ permission: { isProjectPermission: true } });

loadUserSettings();
const doSave = async (form: any) => {
  await utils.sleep(300);
  await api.DomainMonitorSettingsSave({
    ...formState,
  });
  notification.success({
    message: t("certd.saveSuccess"),
  });
};
</script>

<style lang="less">
.page-domain-monitor-setting {
  .settings-form {
    width: 700px;
    margin: 20px;
  }
}
</style>
