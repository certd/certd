<template>
  <fs-page class="page-user-settings page-grant">
    <template #header>
      <div class="title">{{ t("certd.user.setting.grantSetting") }}</div>
    </template>

    <div class="user-settings-form settings-form">
      <a-form :model="formState" name="basic" :label-col="{ span: 8 }" :wrapper-col="{ span: 16 }" autocomplete="off">
        <a-form-item :label="t('certd.user.setting.allowAdminViewCerts')" :name="['allowAdminViewCerts']">
          <div class="flex mt-5">
            <a-switch v-model:checked="formState.allowAdminViewCerts" :disabled="!settingsStore.isPlus" />
            <vip-button class="ml-5" mode="button"></vip-button>
          </div>
          <div class="helper">{{ t("certd.user.setting.allowAdminViewCertsHelper") }}</div>
        </a-form-item>

        <a-form-item label=" " :colon="false" :wrapper-col="{ span: 16 }">
          <loading-button type="primary" html-type="button" :click="doSave">{{ t("certd.confirm") }}</loading-button>
        </a-form-item>
      </a-form>
    </div>
  </fs-page>
</template>

<script setup lang="tsx">
import { computed, reactive, watch } from "vue";
import * as api from "./api";
import { UserGrantSetting } from "./api";
import { Modal, notification } from "ant-design-vue";
import { merge } from "lodash-es";
import { useSettingStore } from "/@/store/settings";
import { useI18n } from "/src/locales";

const { t } = useI18n();
const settingsStore = useSettingStore();
defineOptions({
  name: "UserSecurity",
});

const formState = reactive<Partial<UserGrantSetting>>({
  allowAdminViewCerts: false,
});

async function loadUserSettings() {
  const data: any = await api.GrantSettingsGet();
  merge(formState, data);
}

loadUserSettings();
const doSave = async () => {
  await api.UserSettingSave({
    ...formState,
  });
  notification.success({
    message: t("certd.user.setting.saveSuccess"),
  });
};
</script>

<style lang="less">
.page-user-settings {
  .user-settings-form {
    width: 600px;
    margin: 20px;
  }
}
</style>
