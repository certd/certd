<template>
  <div class="sys-settings-form sys-settings-base">
    <a-form :model="formState" name="basic" :label-col="{ span: 8 }" :wrapper-col="{ span: 16 }" autocomplete="off" @finish="onFinish">
      <a-form-item :label="t('certd.sys.setting.captchaEnabled')" :name="['public', 'captchaEnabled']">
        <a-switch v-model:checked="formState.public.captchaEnabled" />
        <div class="helper" v-html="t('certd.sys.setting.captchaHelper')"></div>
      </a-form-item>
      <a-form-item :label="t('certd.sys.setting.captchaType')" :name="['public', 'captchaAddonId']">
        <addon-selector v-model:model-value="formState.public.captchaAddonId" addon-type="captcha" from="sys" @selected-change="onAddonChanged" />
      </a-form-item>
      <a-form-item v-if="formState.public.captchaType === settingsStore.sysPublic.captchaType" :label="t('certd.sys.setting.captchaTest')">
        <div class="flex items-center">
          <CaptchaInput v-model:model-value="captchaTestForm.captcha" class="w-60%"></CaptchaInput>
          <a-button class="ml-2 mr-2" type="primary" @click="doCaptchaValidate">后端验证</a-button>
          <a-tag v-if="captchaTestForm.pass" color="green" class="flex items-center"> <fs-icon icon="material-symbols:check-circle-rounded"></fs-icon> 校验通过</a-tag>
          <a-tag v-else class="flex items-center"> <fs-icon icon="material-symbols:info-rounded"></fs-icon> 请先点击验证</a-tag>
        </div>
      </a-form-item>

      <a-form-item :name="['public', 'captchaType']" class="hidden">
        <a-input v-model:model-value="formState.public.captchaType"></a-input>
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
import AddonSelector from "../../../certd/addon/addon-selector/index.vue";
import CaptchaInput from "/@/components/captcha/captcha-input.vue";
const { t } = useI18n();

defineOptions({
  name: "SettingCaptcha",
});

const captchaTestForm = reactive({
  captcha: null,
  pass: false,
});

async function doCaptchaValidate() {
  if (!captchaTestForm.captcha) {
    notification.error({
      message: "请进行验证码验证",
    });
    return;
  }
  await api.TestCaptcha(captchaTestForm.captcha);
  notification.success({
    message: "校验通过",
  });
  captchaTestForm.pass = true;
}

const formState = reactive<Partial<SysSettings>>({
  public: {
    icpNo: "",
    mpsNo: "",
  },
  private: {},
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

    if (form.public.captchaEnabled && !captchaTestForm.pass) {
      if (form.public.captchaType === settingsStore.sysPublic.captchaType) {
        notification.error({
          message: "您正在开启登录验证码，请先通过验证码测试，后端校验成功后才能保存",
        });
      } else {
        notification.error({
          message: "您正在开启登录验证码，请先关闭登录验证码开关，保存，然后会显示验证码，进行验证码测试，后端校验成功，之后再开启登录验证码，并保存",
        });
      }

      return;
    }

    await api.SysSettingsSave(form);
    await settingsStore.loadSysSettings();
    notification.success({
      message: t("certd.saveSuccess"),
    });
  } catch (e) {
    console.error(e);
    clearValidState();
  } finally {
    saveLoading.value = false;
  }
};

function clearValidState() {
  captchaTestForm.pass = false;
  captchaTestForm.captcha = null;
}

function onAddonChanged(target: any) {
  formState.public.captchaType = target.type;
  clearValidState();
}
</script>
<style lang="less">
.sys-settings-base {
}
</style>
