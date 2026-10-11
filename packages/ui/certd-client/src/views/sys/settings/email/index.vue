<template>
  <fs-page class="page-setting-email">
    <template #header>
      <div class="title">
        {{ t("certd.sys.settings.emailServerSettings") }}
        <span class="sub">{{ t("certd.sys.settings.setEmailSendingServer") }}</span>
      </div>
    </template>

    <div class="email-form">
      <a-form :model="formState" name="basic" :label-col="{ span: 8 }" :wrapper-col="{ span: 16 }" autocomplete="off" class="" @finish="onFinish">
        <h2>{{ t("certd.sys.settings.email.serverSetting") }}</h2>
        <a-tabs v-model:active-key="activeKey" @change="onChangeActiveKey">
          <a-tab-pane key="custom" :tab="t('certd.sys.settings.useCustomEmailServer')">
            <div>
              <a-form-item :label="t('certd.sys.settings.smtpDomain')" name="host" :rules="[{ required: true, message: t('certd.sys.settings.pleaseEnterSmtpDomain') }]">
                <a-input v-model:value="formState.host" />
                <div class="helper">
                  {{ t("certd.sys.settings.sendFailHelpDoc") }}<a href="https://certd.docmirror.cn/guide/use/email/" target="_blank">{{ t("certd.sys.settings.emailConfigHelpDoc") }}</a>
                </div>
              </a-form-item>

              <a-form-item :label="t('certd.sys.settings.smtpPort')" name="port" :rules="[{ required: true, message: t('certd.sys.settings.pleaseEnterSmtpPort') }]">
                <a-input v-model:value="formState.port" />
                <div class="helper">{{ t("certd.sys.settings.pleaseEnterSmtpPort") }}</div>
              </a-form-item>

              <a-form-item :label="t('certd.common.username')" :name="['auth', 'user']" :rules="[{ required: true, message: t('certd.sys.settings.pleaseEnterUsername') }]">
                <a-input v-model:value="formState.auth.user" />
              </a-form-item>
              <a-form-item :label="t('certd.common.password')" :name="['auth', 'pass']" :rules="[{ required: true, message: t('certd.sys.settings.pleaseEnterPassword') }]">
                <a-input-password v-model:value="formState.auth.pass" />
                <div class="helper">{{ t("certd.sys.settings.qqEmailAuthCodeHelper") }}</div>
              </a-form-item>
              <a-form-item :label="t('certd.sys.settings.senderEmail')" name="sender" :rules="[{ required: true, message: t('certd.sys.settings.pleaseEnterSenderEmail') }]">
                <a-input v-model:value="formState.sender" />
                <div class="helper">{{ t("certd.sys.settings.senderEmailHelper") }}</div>
              </a-form-item>
              <a-form-item :label="t('certd.sys.settings.useSsl')" name="secure">
                <a-switch v-model:checked="formState.secure" />
                <div class="helper">{{ t("certd.sys.settings.sslPortNote") }}</div>
              </a-form-item>
              <a-form-item :label="t('certd.sys.settings.ignoreCertValidation')" :name="['tls', 'rejectUnauthorized']">
                <a-switch v-model:checked="formState.tls.rejectUnauthorized" />
              </a-form-item>
            </div>
          </a-tab-pane>
          <a-tab-pane v-if="formState.usePlus" key="plus" class="plus" :disabled="!settingStore.isPlus">
            <template #tab>
              <span class="flex items-center">
                {{ t("certd.sys.settings.useOfficialEmailServer") }}
                <vip-button class="ml-5" mode="button"></vip-button>
              </span>
            </template>
            <a-form-item :label="t('certd.sys.settings.useOfficialEmailServer')" name="usePlus">
              <div class="flex-o">
                <a-switch v-model:checked="formState.usePlus" :disabled="!settingStore.isPlus" @change="onUsePlusChanged" />
              </div>
              <div class="helper">{{ t("certd.sys.settings.useOfficialEmailServerHelper") }}</div>
            </a-form-item>
          </a-tab-pane>
        </a-tabs>
        <a-form-item :wrapper-col="{ offset: 8, span: 16 }">
          <a-button type="primary" html-type="submit">{{ t("certd.common.save") }}</a-button>
        </a-form-item>

        <div class="flex items-center">
          <h2>{{ t("certd.sys.settings.email.templateSetting") }}</h2>
          <vip-button class="ml-10" mode="button"></vip-button>
        </div>

        <a-form-item :label="t('certd.sys.settings.email.templates')" :name="['templates']">
          <div class="flex flex-wrap">
            <table class="w-full table-auto border-collapse border border-gray-400">
              <thead>
                <tr>
                  <th class="border border-gray-300 px-4 py-2 w-1/3">{{ t("certd.sys.settings.email.templateType") }}</th>
                  <th class="border border-gray-300 px-4 py-2 w-1/3">{{ t("certd.sys.settings.email.templateProvider") }}</th>
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
                      :placeholder="t('certd.sys.settings.email.templateProviderSelectorPlaceholder')"
                    />
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </a-form-item>

        <a-form-item :wrapper-col="{ offset: 8, span: 16 }">
          <a-button type="primary" html-type="submit">{{ t("certd.common.save") }}</a-button>
        </a-form-item>
      </a-form>
    </div>
    <div class="email-form">
      <a-form :model="testFormState" name="basic" :label-col="{ span: 8 }" :wrapper-col="{ span: 16 }" autocomplete="off" @finish="onTestSend">
        <h2>{{ t("certd.sys.settings.email.sendTest") }}</h2>
        <a-form-item :label="t('certd.sys.settings.testReceiverEmail')" name="receiver" :rules="[{ required: true, message: t('certd.sys.settings.pleaseEnterTestReceiverEmail') }]">
          <a-input v-model:value="testFormState.receiver" />
          <div class="helper">{{ t("certd.sys.settings.saveBeforeTest") }}</div>
          <div class="helper">
            {{ t("certd.sys.settings.sendFailHelpDoc") }}<a href="https://certd.docmirror.cn/guide/use/email/" target="_blank">{{ t("certd.sys.settings.emailConfigHelpDoc") }}</a>
          </div>
        </a-form-item>
        <a-form-item :wrapper-col="{ offset: 8, span: 16 }">
          <a-button type="primary" :loading="testFormState.loading" html-type="submit">{{ t("certd.common.test") }}</a-button>
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
import { useI18n } from "/src/locales";
import AddonSelector from "../../../certd/addon/addon-selector/index.vue";
import { merge } from "lodash-es";
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
  merge(formState, data);
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
    message: t("certd.common.saveSuccess"),
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
      message: t("certd.sys.settings.sendSuccess"),
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
