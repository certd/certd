<template>
  <div class="sys-settings-form sys-settings-register">
    <a-form :model="formState" name="register" :label-col="{ span: 8 }" :wrapper-col="{ span: 16 }" autocomplete="off" @finish="onFinish">
      <a-form-item :label="t('certd.enableSelfRegistration')" :name="['public', 'registerEnabled']">
        <a-switch v-model:checked="formState.public.registerEnabled" />
      </a-form-item>
      <a-form-item :label="t('certd.enableCommonSelfServicePasswordRetrieval')" :name="['public', 'selfServicePasswordRetrievalEnabled']">
        <a-switch v-model:checked="formState.public.selfServicePasswordRetrievalEnabled" />
      </a-form-item>
      <a-form-item :label="t('certd.enableUserValidityPeriod')" :name="['public', 'userValidTimeEnabled']">
        <div class="flex-o">
          <a-switch v-model:checked="formState.public.userValidTimeEnabled" :disabled="!settingsStore.isPlus" />
          <vip-button class="ml-5" mode="button"></vip-button>
        </div>
        <div class="helper">{{ t("certd.userValidityPeriodHelper") }}</div>
      </a-form-item>
      <template v-if="formState.public.registerEnabled">
        <a-form-item :label="t('certd.enableUsernameRegistration')" :name="['public', 'usernameRegisterEnabled']">
          <a-switch v-model:checked="formState.public.usernameRegisterEnabled" />
        </a-form-item>

        <a-form-item :label="t('certd.enableEmailRegistration')" :name="['public', 'emailRegisterEnabled']">
          <div class="flex-o">
            <a-switch v-model:checked="formState.public.emailRegisterEnabled" :disabled="!settingsStore.isPlus" :title="t('certd.proFeature')" />
            <vip-button class="ml-5" mode="button"></vip-button>
          </div>
          <div class="helper">
            <router-link to="/sys/settings/email">{{ t("certd.emailServerSetup") }}</router-link>
          </div>
        </a-form-item>
        <a-form-item :label="t('certd.defaultLoginType')" :name="['public', 'defaultLoginType']" required>
          <div class="flex-o">
            <a-radio-group v-model:value="formState.public.defaultLoginType" :options="loginTypeOptions" :title="t('certd.commFeature')" />
          </div>
        </a-form-item>
        <a-form-item :label="t('certd.enableSmsLoginRegister')" :name="['public', 'smsLoginEnabled']">
          <div class="flex-o">
            <a-switch v-model:checked="formState.public.smsLoginEnabled" :disabled="!settingsStore.isComm" :title="t('certd.commFeature')" />
            <vip-button class="ml-5" mode="comm"></vip-button>
          </div>
        </a-form-item>
        <template v-if="formState.public.smsLoginEnabled">
          <a-form-item :label="t('certd.smsProvider')" :name="['private', 'sms', 'type']">
            <a-select v-model:value="formState.private.sms.type" @change="smsTypeChange">
              <a-select-option value="aliyun">{{ t("certd.aliyunSms") }}</a-select-option>
              <a-select-option value="tencent">{{ t("certd.tencentSms") }}</a-select-option>
              <a-select-option value="yfysms">{{ t("certd.yfySms") }}</a-select-option>
            </a-select>
          </a-form-item>
          <template v-for="item of smsTypeDefineInputs" :key="item.simpleKey">
            <fs-form-item v-model="formState.private.sms.config[item.simpleKey]" :path="'private.sms.config' + item.key" :item="item" />
          </template>

          <a-form-item :label="t('certd.smsTest')">
            <div class="flex">
              <a-input v-model:value="testMobile" :placeholder="t('certd.testMobilePlaceholder')" />
              <loading-button class="ml-5" :title="t('certd.saveThenTest')" type="primary" :click="testSendSms">{{ t("certd.testButton") }}</loading-button>
            </div>
            <div class="helper">{{ t("certd.saveThenTest") }}</div>
          </a-form-item>
        </template>
      </template>
      <a-form-item label=" " :colon="false" :wrapper-col="{ span: 16 }">
        <a-button :loading="saveLoading" type="primary" html-type="submit">{{ t("certd.saveButton") }}</a-button>
      </a-form-item>
    </a-form>
  </div>
</template>

<script setup lang="tsx">
import { notification } from "ant-design-vue";
import { merge } from "lodash-es";
import { computed, reactive, ref, Ref } from "vue";
import { useSettingStore } from "/@/store/settings";
import * as api from "/@/views/sys/settings/api";
import { SysSettings } from "/@/views/sys/settings/api";
import { useI18n } from "/src/locales";
const { t } = useI18n();

defineOptions({
  name: "SettingRegister",
});

const testMobile = ref("");
async function testSendSms() {
  if (!testMobile.value) {
    notification.error({
      message: t("certd.enterTestMobile"),
    });
    return;
  }
  await api.TestSms({
    mobile: testMobile.value,
  });
  notification.success({
    message: t("certd.sendSuccess"),
  });
}

const formState = reactive<Partial<SysSettings>>({
  public: {
    registerEnabled: false,
  },
  private: {
    sms: {
      type: "aliyun",
      config: {},
    },
  },
});

const rules = {
  leastOneLogin: {
    validator: (rule: any, value: any) => {
      if (!formState.public.passwordLoginEnabled && !formState.public.smsLoginEnabled) {
        return Promise.reject(t("certd.atLeastOneLoginRequired"));
      }
      return Promise.resolve();
    },
  },
  required: {
    required: true,
    trigger: "change",
    message: t("certd.fieldRequired"),
  },
};

async function smsTypeChange(value: string) {
  if (formState.private?.sms?.config) {
    formState.private.sms.config = {};
  }

  await loadTypeDefine(value);
}
const smsTypeDefineInputs: Ref = ref({});
async function loadTypeDefine(type: string) {
  const define: any = await api.GetSmsTypeDefine(type);
  const keys = Object.keys(define.input);
  const inputs: any = {};
  keys.forEach(key => {
    const value = define.input[key];
    value.simpleKey = key;
    value.key = "private.sms.config." + key;
    if (!value.component) {
      value.component = {
        name: "a-input",
      };
    }
    if (!value.component.name) {
      value.component.vModel = "value";
    }
    if (!value.rules) {
      value.rules = [];
    }
    if (value.required) {
      value.rules.push(rules.required);
    }

    inputs[key] = define.input[key];
  });
  smsTypeDefineInputs.value = inputs;
}

async function loadSysSettings() {
  const data: any = await api.SysSettingsGet();
  merge(formState, data);
  if (data?.private.sms?.type) {
    await loadTypeDefine(data.private.sms.type);
  }
  if (!settingsStore.isPlus) {
    formState.public.userValidTimeEnabled = false;
    formState.public.emailRegisterEnabled = false;
  }

  if (!settingsStore.isComm) {
    formState.public.smsLoginEnabled = false;
  }
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

const loginTypeOptions = computed(() => [
  {
    label: t("authentication.loginType.password"),
    value: "password",
  },
  {
    label: t("authentication.loginType.sms"),
    value: "sms",
    disabled: !formState.public.smsLoginEnabled,
  },
]);
</script>
<style lang="less">
.sys-settings-register {
  width: 1000px !important;

  .addon-selector {
    .inner {
      justify-content: space-between;
    }
  }
}
</style>
