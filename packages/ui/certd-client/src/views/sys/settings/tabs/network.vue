<template>
  <div class="sys-settings-form sys-settings-network">
    <a-form :model="formState" name="basic" :label-col="{ span: 8 }" :wrapper-col="{ span: 16 }" autocomplete="off" @finish="onFinish">
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

      <a-form-item :label="t('certd.sys.setting.environmentVars')" :name="['private', 'environmentVars']">
        <a-textarea v-model:value="formState.private.environmentVars" :placeholder="environmentVarsExample" rows="4" />
        <div class="helper">{{ t("certd.sys.setting.environmentVarsHelper") }}</div>
      </a-form-item>

      <a-form-item :label="t('certd.sys.setting.commonHeaders')" :name="['private', 'commonHeaders']">
        <a-textarea v-model:value="formState.private.commonHeaders" :placeholder="commonHeadersExample" rows="4" />
        <div class="helper">{{ t("certd.sys.setting.commonHeadersHelper") }}</div>
      </a-form-item>

      <a-form-item :label="t('certd.dualStackNetwork')" :name="['private', 'dnsResultOrder']">
        <a-select v-model:value="formState.private.dnsResultOrder">
          <a-select-option value="verbatim">{{ t("certd.default") }}</a-select-option>
          <a-select-option value="ipv4first">{{ t("certd.ipv4Priority") }}</a-select-option>
          <a-select-option value="ipv6first">{{ t("certd.ipv6Priority") }}</a-select-option>
        </a-select>
        <div class="helper">
          {{ t("certd.dualStackNetworkHelper") }}, <a href="https://certd.docmirror.cn/guide/use/setting/ipv6.html" target="_blank">{{ t("certd.helpDocLink") }}</a>
        </div>
      </a-form-item>
      <a-form-item :label="t('certd.sys.setting.reverseProxy')" :name="['private', 'reverseProxy']">
        <div class="mt-5">
          <div v-for="(value, key) in formState.private.reverseProxies" :key="key" class="flex items-center p-2 border-b border-gray-300">
            <span class="flex-1">{{ key }}</span>
            <span class="flex-1 ml-5"><a-input v-model:value="formState.private.reverseProxies[key]" placeholder="proxy.xxxx.com" allow-clear /></span>
          </div>
        </div>
        <div class="helper">{{ t("certd.sys.setting.reverseProxyHelper") }}</div>
      </a-form-item>

      <a-form-item label=" " :colon="false" :wrapper-col="{ span: 8 }">
        <a-button :loading="saveLoading" type="primary" html-type="submit">{{ t("certd.saveButton") }}</a-button>
      </a-form-item>
    </a-form>
  </div>
</template>

<script setup lang="tsx">
import { proxyRefs, reactive, ref } from "vue";
import { SysSettings } from "/@/views/sys/settings/api";
import * as api from "/@/views/sys/settings/api";
import { merge } from "lodash-es";
import { useSettingStore } from "/@/store/settings";
import { message, notification } from "ant-design-vue";
import { useI18n } from "/src/locales";
const { t } = useI18n();
import { util } from "/@/utils";
defineOptions({
  name: "SettingNetwork",
});

const environmentVarsExample = ref(
  `ALIYUN_CLIENT_CONNECT_TIMEOUT=16000 #连接超时，单位毫秒
ALIYUN_CLIENT_READ_TIMEOUT=16000 #读取数据超时，单位毫秒`
);
const commonHeadersExample = ref(
  `User-Agent=certd
X-Custom-Header=value`
);

const formState = reactive<Partial<SysSettings>>({
  public: {},
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
    form.private.reverseProxies = formState.private.reverseProxies;
    await api.SysSettingsSave(form);
    await settingsStore.loadSysSettings();
    notification.success({
      message: t("certd.saveSuccess"),
    });
  } finally {
    saveLoading.value = false;
  }
};

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
<style lang="less"></style>
