<template>
  <div class="sys-settings-form sys-settings-base">
    <a-form :model="formState" name="basic" :label-col="{ span: 8 }" :wrapper-col="{ span: 16 }" autocomplete="off" @finish="onFinish" @finish-failed="onFinishFailed">
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

      <a-form-item :label="t('certd.httpProxy')" :name="['private', 'httpProxy']" :rules="urlRules">
        <a-input v-model:value="formState.private.httpProxy" :placeholder="t('certd.httpProxyPlaceholder')" />
        <div class="helper">{{ t("certd.httpProxyHelper") }}</div>
      </a-form-item>

      <a-form-item :label="t('certd.httpsProxy')" :name="['private', 'httpsProxy']" :rules="urlRules">
        <div class="flex">
          <a-input v-model:value="formState.private.httpsProxy" :placeholder="t('certd.httpsProxyPlaceholder')" />
          <a-button class="ml-5" type="primary" :loading="testProxyLoading" :title="t('certd.saveThenTestTitle')" @click="testProxy">{{ t("certd.testButton") }}</a-button>
        </div>
        <div class="helper">{{ t("certd.httpsProxyHelper") }}</div>
      </a-form-item>

      <a-form-item :label="t('certd.dualStackNetwork')" :name="['private', 'dnsResultOrder']">
        <a-select v-model:value="formState.private.dnsResultOrder">
          <a-select-option value="verbatim">{{ t("certd.default") }}</a-select-option>
          <a-select-option value="ipv4first">{{ t("certd.ipv4Priority") }}</a-select-option>
          <a-select-option value="ipv6first">{{ t("certd.ipv6Priority") }}</a-select-option>
        </a-select>
        <div class="helper">{{ t("certd.dualStackNetworkHelper") }}</div>
      </a-form-item>

      <a-form-item :label="t('certd.sys.setting.showRunStrategy')" :name="['public', 'showRunStrategy']">
        <a-switch v-model:checked="formState.public.showRunStrategy" />
        <div class="helper">{{ t("certd.sys.setting.showRunStrategyHelper") }}</div>
      </a-form-item>

      <a-form-item :label="t('certd.enableCommonCnameService')" :name="['private', 'commonCnameEnabled']">
        <a-switch v-model:checked="formState.private.commonCnameEnabled" />
        <div class="helper" v-html="t('certd.commonCnameHelper')"></div>
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
import { util } from "/@/utils";
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

const urlRules = ref({
  type: "url",
  message: "请输入正确的URL",
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

const onFinishFailed = (errorInfo: any) => {
  // console.log("Failed:", errorInfo);
};

async function stopOtherUserTimer() {
  await api.stopOtherUserTimer();
  notification.success({
    message: t("certd.stopSuccess"),
  });
}

const testProxyLoading = ref(false);
async function testProxy() {
  testProxyLoading.value = true;
  try {
    const res = await api.TestProxy();
    let success = true;
    if (res.google !== true || res.baidu !== true) {
      success = false;
    }
    const content = () => {
      return (
        <div>
          <div>
            {t("certd.google")}: {res.google === true ? t("certd.success") : util.maxLength(res.google)}
          </div>
          <div>
            {t("certd.baidu")}: {res.baidu === true ? t("certd.success") : util.maxLength(res.baidu)}
          </div>
        </div>
      );
    };
    if (!success) {
      notification.error({
        message: t("certd.testFailed"),
        description: content,
      });
      return;
    }
    notification.success({
      message: t("certd.testCompleted"),
      description: content,
    });
  } finally {
    testProxyLoading.value = false;
  }
}
</script>
<style lang="less">
.sys-settings-base {
}
</style>
