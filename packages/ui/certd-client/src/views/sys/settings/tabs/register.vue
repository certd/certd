<template>
  <div class="sys-settings-form sys-settings-register">
    <a-form :model="formState" name="register" :label-col="{ span: 8 }" :wrapper-col="{ span: 16 }" autocomplete="off" @finish="onFinish">
      <a-form-item :label="t('certd.sys.settings.enableSelfRegistration')" :name="['public', 'registerEnabled']">
        <a-switch v-model:checked="formState.public.registerEnabled" />
      </a-form-item>
      <a-form-item :label="t('certd.sys.settings.enableCommonSelfServicePasswordRetrieval')" :name="['public', 'selfServicePasswordRetrievalEnabled']">
        <a-switch v-model:checked="formState.public.selfServicePasswordRetrievalEnabled" />
      </a-form-item>
      <a-form-item :label="t('certd.sys.settings.enableUserValidityPeriod')" :name="['public', 'userValidTimeEnabled']">
        <div class="flex-o">
          <a-switch v-model:checked="formState.public.userValidTimeEnabled" :disabled="!settingsStore.isPlus" />
          <vip-button class="ml-5" mode="button"></vip-button>
        </div>
        <div class="helper">
          {{ t("certd.sys.settings.userValidityPeriodHelper") }}
          <a href="https://certd.docmirror.cn/guide/use/setting/user-valid.html" target="_blank">{{ t("certd.common.helpDocLink") }}</a>
        </div>
      </a-form-item>
      <template v-if="formState.public.registerEnabled">
        <a-form-item :label="t('certd.sys.settings.enableUsernameRegistration')" :name="['public', 'usernameRegisterEnabled']">
          <a-switch v-model:checked="formState.public.usernameRegisterEnabled" />
        </a-form-item>

        <a-form-item :label="t('certd.sys.settings.enableEmailRegistration')" :name="['public', 'emailRegisterEnabled']">
          <div class="flex-o">
            <a-switch v-model:checked="formState.public.emailRegisterEnabled" :disabled="!settingsStore.isPlus" :title="t('certd.sys.settings.proFeature')" />
            <vip-button class="ml-5" mode="button"></vip-button>
          </div>
          <div class="helper">
            <router-link to="/sys/settings/email">{{ t("certd.sys.settings.emailServerSetup") }}</router-link>
          </div>
        </a-form-item>
        <a-form-item :label="t('certd.sys.settings.defaultLoginType')" :name="['public', 'defaultLoginType']" required>
          <div class="flex-o">
            <a-radio-group v-model:value="formState.public.defaultLoginType" :options="loginTypeOptions" :title="t('certd.sys.settings.commFeature')" />
          </div>
        </a-form-item>
        <a-form-item :label="t('certd.sys.settings.enableSmsLoginRegister')" :name="['public', 'smsLoginEnabled']">
          <div class="flex-o">
            <a-switch v-model:checked="formState.public.smsLoginEnabled" :disabled="!settingsStore.isComm" :title="t('certd.sys.settings.commFeature')" />
            <vip-button class="ml-5" mode="comm"></vip-button>
          </div>
        </a-form-item>
        <template v-if="formState.public.smsLoginEnabled">
          <a-form-item :label="t('certd.sys.settings.smsProvider')" :name="['private', 'sms', 'type']">
            <a-select v-model:value="formState.private.sms.type" @change="smsTypeChange">
              <a-select-option value="aliyun">{{ t("certd.sys.settings.aliyunSms") }}</a-select-option>
              <a-select-option value="tencent">{{ t("certd.sys.settings.tencentSms") }}</a-select-option>
              <a-select-option value="yfysms">{{ t("certd.sys.settings.yfySms") }}</a-select-option>
            </a-select>
          </a-form-item>
          <template v-for="item of smsTypeDefineInputs" :key="item.simpleKey">
            <fs-form-item v-model="formState.private.sms.config[item.simpleKey]" :path="'private.sms.config' + item.key" :item="item" />
          </template>

          <a-form-item :label="t('certd.sys.settings.smsTest')">
            <div class="flex">
              <a-input v-model:value="testMobile" :placeholder="t('certd.sys.settings.testMobilePlaceholder')" />
              <loading-button class="ml-5" :title="t('certd.sys.settings.saveThenTest')" type="primary" :click="testSendSms">{{ t("certd.common.testButton") }}</loading-button>
            </div>
            <div class="helper">{{ t("certd.sys.settings.saveThenTest") }}</div>
          </a-form-item>
        </template>
      </template>
      <a-form-item label=" " :colon="false" :wrapper-col="{ span: 16 }">
        <a-button :loading="saveLoading" type="primary" html-type="submit">{{ t("certd.sys.settings.saveButton") }}</a-button>
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
      message: t("certd.sys.settings.enterTestMobile"),
    });
    return;
  }
  await api.TestSms({
    mobile: testMobile.value,
  });
  notification.success({
    message: t("certd.sys.settings.sendSuccess"),
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
        return Promise.reject(t("certd.sys.settings.atLeastOneLoginRequired"));
      }
      return Promise.resolve();
    },
  },
  required: {
    required: true,
    trigger: "change",
    message: t("certd.common.fieldRequired"),
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
      message: t("certd.common.saveSuccess"),
    });
  } finally {
    saveLoading.value = false;
  }
};

const loginTypeOptions = computed(() => [
  {
    label: t("certd.auth.loginType.password"),
    value: "password",
  },
  {
    label: t("certd.auth.loginType.sms"),
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
