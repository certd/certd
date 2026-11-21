<template>
  <fs-page class="page-user-settings page-two-factor">
    <template #header>
      <div class="title">{{ t("certd.mine.securitySettings") }}</div>
    </template>

    <div class="user-settings-form settings-form">
      <a-form :model="formState" name="basic" :label-col="{ span: 8 }" :wrapper-col="{ span: 16 }" autocomplete="off">
        <a-form-item :label="t('certd.mine.twoFactorConfig')" :name="['authenticator', 'enabled']">
          <div class="flex mt-5">
            <a-switch v-model:checked="formState.authenticator.enabled" :disabled="!settingsStore.isPlus" @change="onAuthenticatorEnabledChanged" />

            <a-button
              v-if="formState.authenticator.enabled && formState.authenticator.verified"
              :disabled="authenticatorOpenRef || !settingsStore.isPlus"
              size="small"
              class="ml-5"
              type="primary"
              @click="authenticatorForm.open = true"
            >
              {{ t("certd.mine.rebind") }}
            </a-button>

            <vip-button class="ml-5" mode="button"></vip-button>
          </div>

          <div class="helper">{{ t("certd.mine.twoFactorAuthHelper") }}</div>
        </a-form-item>

        <a-form-item v-if="formState.authenticator.enabled" :label="t('certd.mine.twoFactorLogin')" :name="'loginEnabled'">
          <a-switch v-model:checked="formState.loginEnabled" :disabled="!settingsStore.isPlus" @change="onLoginEnabledChanged" />
          <div class="helper">{{ t("certd.mine.twoFactorLoginHelper") }}</div>
        </a-form-item>

        <a-form-item v-if="authenticatorOpenRef" :label="t('certd.mine.bindDevice')" class="authenticator-config">
          <h3 class="font-bold m-5">{{ t("certd.mine.step1") }}</h3>
          <div class="ml-20">
            <ul>
              <li>
                <a-tooltip :title="t('certd.mine.tooltipGoogleServiceError')">
                  <a href="https://appgallery.huawei.com/app/C100262999" target="_blank">Microsoft Authenticator</a>
                </a-tooltip>
              </li>
              <li>
                <a href="https://sj.qq.com/appdetail/com.tencent.authenticator" target="_blank">腾讯身份验证器</a>
              </li>
              <li>
                <a href="https://www.synology.cn/zh-cn/dsm/feature/authentication" target="_blank">群晖身份验证器</a>
              </li>
              <li>
                <a-tooltip :title="t('certd.mine.tooltipGoogleServiceError')">
                  <a href="https://play.google.com/store/apps/details?id=com.google.android.apps.authenticator2" target="_blank">Google Authenticator</a>
                </a-tooltip>
              </li>
              <li>
                <a href="https://play.google.com/store/apps/details?id=com.authy.authy" target="_blank">Authy</a>
              </li>
            </ul>
          </div>
          <h3 class="font-bold m-10">{{ t("certd.mine.step2") }}</h3>
          <div v-if="authenticatorForm.qrcodeSrc" class="qrcode">
            <div class="ml-20">
              <img class="full-w" :src="authenticatorForm.qrcodeSrc" />
            </div>
            <div class="ml-20 mt-5">
              <div>您也可以手动添加：</div>
              <div class="flex mt-5">
                <a-tag type="primary" color="green" class="mr-2">Secret：</a-tag>
                <fs-copyable :model-value="authenticatorForm.secret" />
              </div>
              <div class="flex mt-5">
                <a-tag type="primary" color="green" class="mr-2">Link：</a-tag>
                <fs-copyable :model-value="authenticatorForm.link" />
              </div>
            </div>
          </div>
          <h3 class="font-bold m-10">{{ t("certd.mine.step3") }}</h3>
          <div class="ml-20">
            <a-input v-model:value="authenticatorForm.verifyCode" :placeholder="t('certd.mine.inputVerifyCode')" />
          </div>
          <div class="ml-20 flex mt-10">
            <loading-button type="primary" html-type="button" :click="doAuthenticatorSave">{{ t("certd.common.confirm") }}</loading-button>
            <a-button class="ml-1" @click="authenticatorForm.open = false">{{ t("certd.common.cancel") }}</a-button>
          </div>
        </a-form-item>
      </a-form>
    </div>
  </fs-page>
</template>

<script setup lang="tsx">
import { computed, reactive, watch } from "vue";
import * as api from "./api";
import { UserTwoFactorSetting } from "./api";
import { notification } from "ant-design-vue";
import { useFormDialog } from "/@/use/use-dialog";
import { merge } from "lodash-es";
import { useSettingStore } from "/@/store/settings";
import { useI18n } from "/src/locales";

const { t } = useI18n();
const { openFormDialog } = useFormDialog();
const settingsStore = useSettingStore();
defineOptions({
  name: "UserSecurity",
});

const formState = reactive<Partial<UserTwoFactorSetting>>({
  authenticator: {
    enabled: false,
    verified: false,
  },
});

const authenticatorForm = reactive({
  qrcodeSrc: "",
  verifyCode: "",
  link: "",
  secret: "",
  open: false,
});

const authenticatorOpenRef = computed(() => {
  return formState.authenticator.enabled && (authenticatorForm.open || !formState.authenticator.verified);
});
watch(
  () => {
    return authenticatorOpenRef.value;
  },
  async open => {
    if (open) {
      //base64 转图片
      const { qrcode, link, secret } = await api.TwoFactorAuthenticatorGet();
      authenticatorForm.qrcodeSrc = qrcode;
      authenticatorForm.link = link;
      authenticatorForm.secret = secret;
    } else {
      authenticatorForm.qrcodeSrc = "";
      authenticatorForm.link = "";
      authenticatorForm.secret = "";
      authenticatorForm.verifyCode = "";
    }
  }
);

async function loadUserSettings() {
  const data: any = await api.TwoFactorSettingsGet();
  merge(formState, data);
}

loadUserSettings();
const doAuthenticatorSave = async (form: any) => {
  await api.TwoFactorAuthenticatorSave({
    verifyCode: authenticatorForm.verifyCode,
  });
  notification.success({
    message: t("certd.common.saveSuccess"),
  });
  authenticatorForm.open = false;
  formState.authenticator.verified = true;
};

function confirmWithPassword(title: string, submit: (password: string) => Promise<void>) {
  const prompt = t("certd.mine.inputLoginPassword");
  return openFormDialog({
    title,
    columns: {
      password: {
        title: t("certd.mine.loginPassword"),
        type: "password",
        form: {
          col: { span: 24 },
          component: { placeholder: prompt, autocomplete: "current-password" },
          rules: [{ required: true, message: prompt }],
        },
      },
    },
    wrapper: {
      width: 600,
    },
    async onSubmit(form: { password: string }) {
      await submit(form.password);
    },
  });
}

function onAuthenticatorEnabledChanged(value: boolean) {
  if (value || !formState.authenticator.verified) {
    return;
  }
  formState.authenticator.enabled = true;
  return confirmWithPassword(t("certd.mine.confirmDisable2FA"), async password => {
    await api.TwoFactorAuthenticatorOff(password);
    formState.authenticator.enabled = false;
    formState.authenticator.verified = false;
    authenticatorForm.open = false;
    notification.success({ message: t("certd.common.disabledSuccess") });
  });
}

async function onLoginEnabledChanged(value: boolean) {
  if (!value) {
    formState.loginEnabled = true;
    return confirmWithPassword(t("certd.mine.confirmDisable2FALogin"), async password => {
      await api.TwoFactorSettingsSave({ loginEnabled: false, password });
      formState.loginEnabled = false;
      notification.success({ message: t("certd.common.disabledSuccess") });
    });
  }
  try {
    await api.TwoFactorSettingsSave({ loginEnabled: value });
    notification.success({
      message: t("certd.common.saveSuccess"),
    });
  } catch (error) {
    formState.loginEnabled = !value;
    throw error;
  }
}
</script>

<style lang="less">
.page-user-settings {
  .user-settings-form {
    width: 700px;
    margin: 20px;
  }
}
</style>
