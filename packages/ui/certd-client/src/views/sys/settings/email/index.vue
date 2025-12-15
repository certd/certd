<template>
  <fs-page class="page-setting-email">
    <template #header>
      <div class="title">
        {{ t("certd.emailServerSettings") }}
        <span class="sub">{{ t("certd.setEmailSendingServer") }}</span>
      </div>
    </template>

    <div class="email-form">
      <a-form :model="formState" name="basic" :label-col="{ span: 8 }" :wrapper-col="{ span: 16 }" autocomplete="off" class="" @finish="onFinish">
        <h2>{{ t("certd.sys.setting.email.serverSetting") }}</h2>
        <a-tabs v-model:active-key="activeKey" @change="onChangeActiveKey">
          <a-tab-pane key="custom" :tab="t('certd.useCustomEmailServer')">
            <div>
              <a-form-item :label="t('certd.smtpDomain')" name="host" :rules="[{ required: true, message: t('certd.pleaseEnterSmtpDomain') }]">
                <a-input v-model:value="formState.host" />
              </a-form-item>

              <a-form-item :label="t('certd.smtpPort')" name="port" :rules="[{ required: true, message: t('certd.pleaseEnterSmtpPort') }]">
                <a-input v-model:value="formState.port" />
              </a-form-item>

              <a-form-item :label="t('certd.username')" :name="['auth', 'user']" :rules="[{ required: true, message: t('certd.pleaseEnterUsername') }]">
                <a-input v-model:value="formState.auth.user" />
              </a-form-item>
              <a-form-item :label="t('certd.password')" :name="['auth', 'pass']" :rules="[{ required: true, message: t('certd.pleaseEnterPassword') }]">
                <a-input-password v-model:value="formState.auth.pass" />
                <div class="helper">{{ t("certd.qqEmailAuthCodeHelper") }}</div>
              </a-form-item>
              <a-form-item :label="t('certd.senderEmail')" name="sender" :rules="[{ required: true, message: t('certd.pleaseEnterSenderEmail') }]">
                <a-input v-model:value="formState.sender" />
              </a-form-item>
              <a-form-item :label="t('certd.useSsl')" name="secure">
                <a-switch v-model:checked="formState.secure" />
                <div class="helper">{{ t("certd.sslPortNote") }}</div>
              </a-form-item>
              <a-form-item :label="t('certd.ignoreCertValidation')" :name="['tls', 'rejectUnauthorized']">
                <a-switch v-model:checked="formState.tls.rejectUnauthorized" />
              </a-form-item>
            </div>
          </a-tab-pane>
          <a-tab-pane key="plus" class="plus" :disabled="!settingStore.isPlus">
            <template #tab>
              <span class="flex items-center">
                {{ t("certd.useOfficialEmailServer") }}
                <vip-button class="ml-5" mode="button"></vip-button>
              </span>
            </template>
            <a-form-item :label="t('certd.useOfficialEmailServer')" name="usePlus">
              <div class="flex-o">
                <a-switch v-model:checked="formState.usePlus" :disabled="!settingStore.isPlus" @change="onUsePlusChanged" />
              </div>
              <div class="helper">{{ t("certd.useOfficialEmailServerHelper") }}</div>
            </a-form-item>
          </a-tab-pane>
        </a-tabs>
        <a-form-item :wrapper-col="{ offset: 8, span: 16 }">
          <a-button type="primary" html-type="submit">{{ t("certd.save") }}</a-button>
        </a-form-item>

        <h2>{{ t("certd.sys.setting.email.templateSetting") }}</h2>
        <a-form-item :label="t('certd.sys.setting.email.templates')" :name="['templates']">
          <div class="flex flex-wrap">
            <table class="w-full table-auto border-collapse border border-gray-400">
              <thead>
                <tr>
                  <th class="border border-gray-300 px-4 py-2 w-1/3">{{ t("certd.sys.setting.email.templateType") }}</th>
                  <th class="border border-gray-300 px-4 py-2 w-1/3">{{ t("certd.sys.setting.email.templateProvider") }}</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(item, key) of emailTemplates" :key="key">
                  <td class="border border-gray-300 px-4 py-2">
                    <div class="flex items-center" :title="item.desc">
                      <fs-icon :icon="item.icon" class="mr-2 text-blue-600" />
                      {{ item.title }}
                    </div>
                  </td>
                  <td class="border border-gray-300 px-4 py-2">
                    <AddonSelector
                      v-model:model-value="item.addonId"
                      :disabled="!settingStore.isPlus"
                      addon-type="emailTemplate"
                      from="sys"
                      :type="item.name"
                      :placeholder="t('certd.sys.setting.email.templateProviderSelectorPlaceholder')"
                    />
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </a-form-item>

        <a-form-item :wrapper-col="{ offset: 8, span: 16 }">
          <a-button type="primary" html-type="submit">{{ t("certd.save") }}</a-button>
        </a-form-item>
      </a-form>
    </div>
    <div class="email-form">
      <a-form :model="testFormState" name="basic" :label-col="{ span: 8 }" :wrapper-col="{ span: 16 }" autocomplete="off" @finish="onTestSend">
        <h2>{{ t("certd.sys.setting.email.sendTest") }}</h2>
        <a-form-item :label="t('certd.testReceiverEmail')" name="receiver" :rules="[{ required: true, message: t('certd.pleaseEnterTestReceiverEmail') }]">
          <a-input v-model:value="testFormState.receiver" />
          <div class="helper">{{ t("certd.saveBeforeTest") }}</div>
          <div class="helper">
            {{ t("certd.sendFailHelpDoc") }}<a href="https://certd.docmirror.cn/guide/use/email/" target="_blank">{{ t("certd.emailConfigHelpDoc") }}</a>
          </div>
          <div class="helper">{{ t("certd.tryOfficialEmailServer") }}</div>
        </a-form-item>
        <a-form-item :wrapper-col="{ offset: 8, span: 16 }">
          <a-button type="primary" :loading="testFormState.loading" html-type="submit">{{ t("certd.test") }}</a-button>
        </a-form-item>
      </a-form>
    </div>
  </fs-page>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from "vue";
import * as api from "../api";
import * as emailApi from "./api.email";
import { notification } from "ant-design-vue";
import { useSettingStore } from "/src/store/settings";
import * as _ from "lodash-es";
import { useI18n } from "/src/locales";
import AddonSelector from "../../../certd/addon/addon-selector/index.vue";
const { t } = useI18n();
defineOptions({
  name: "EmailSetting",
});

interface FormState {
  host: string;
  port: number;
  auth: {
    user: string;
    pass: string;
  };
  secure: boolean; // use TLS
  tls: {
    // do not fail on invalid certs
    rejectUnauthorized?: boolean;
  };
  sender: string;
  usePlus: boolean;
  templates: {
    pipelineResult: any;
    registerCode: any;
    forgotPassword: any;
  };
}

const activeKey = ref("custom");
const formState = reactive<Partial<FormState>>({
  auth: {
    user: "",
    pass: "",
  },
  tls: {},
  usePlus: false,
});

const emailTemplates = ref([]);
async function loadEmailTemplates() {
  emailTemplates.value = await emailApi.GetEmailTemplates();
}

function fillEmailTemplates(form: any) {
  const providers: any = {};
  for (const item of emailTemplates.value) {
    const type = item.name;
    providers[type] = {
      type: type,
      title: item.title,
      icon: item.icon,
      addonId: item.addonId || null,
    };
  }
  form.templates = providers;
  return providers;
}

async function load() {
  const data: any = await api.EmailSettingsGet();
  _.merge(formState, data);
}

onMounted(async () => {
  await load();
  refreshActiveKeyByUsePlus();
  await loadEmailTemplates();
});

const onFinish = async (form: any) => {
  fillEmailTemplates(form);
  await api.EmailSettingsSave(form);
  notification.success({
    message: t("certd.saveSuccess"),
  });
};

async function onUsePlusChanged() {
  refreshActiveKeyByUsePlus();
  await onFinish(formState);
}

async function refreshActiveKeyByUsePlus() {
  if (formState.usePlus) {
    activeKey.value = "plus";
  } else {
    activeKey.value = "custom";
  }
}
async function onChangeActiveKey(key: string) {
  activeKey.value = key;
  if (key === "plus") {
    formState.usePlus = true;
  } else {
    formState.usePlus = false;
  }
  await onFinish(formState);
}

interface TestFormState {
  receiver: string;
  loading: boolean;
}
const testFormState = reactive<TestFormState>({
  receiver: "",
  loading: false,
});
async function onTestSend() {
  testFormState.loading = true;
  try {
    await emailApi.TestSend(testFormState.receiver);
    notification.success({
      message: t("certd.sendSuccess"),
    });
  } finally {
    testFormState.loading = false;
  }
}

const settingStore = useSettingStore();
</script>

<style lang="less">
.page-setting-email {
  .ant-tabs-nav {
    margin-left: 80px;
  }
  .email-form-box {
    display: flex;
  }

  h2 {
    margin: 20px 0px;
    font-weight: 600;
  }

  .email-form {
    width: 700px;
    max-width: 100%;
    margin: 20px;
  }

  .helper {
    padding: 1px;
    margin: 0px;
    color: #999;
    font-size: 10px;
  }
  .addon-selector {
    .inner {
      justify-content: space-between;
    }
  }
}
</style>
