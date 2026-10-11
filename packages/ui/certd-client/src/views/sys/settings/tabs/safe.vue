<template>
  <div class="sys-settings-form sys-settings-safe">
    <a-form ref="formRef" :model="formState" :label-col="{ span: 8 }" :wrapper-col="{ span: 16 }" autocomplete="off">
      <h2>{{ t("certd.sys.settings.siteHide") }}</h2>
      <a-form-item :label="t('certd.sys.settings.enableSiteHide')" :name="['hidden', 'enabled']" :required="true">
        <div class="flex">
          <a-switch v-model:checked="formState.hidden.enabled" />
        </div>

        <div class="helper">
          {{ t("certd.sys.settings.siteHideDescription") }}
          <a href="https://certd.docmirror.cn/guide/feature/safe/hidden" class="flex items-center" target="_blank">
            <span>{{ t("certd.common.helpDoc") }}</span>
            <fs-icon class="ml-1" icon="mingcute:question-line"></fs-icon
          ></a>
        </div>
      </a-form-item>
      <a-form-item v-if="formState.hidden.enabled" :label="t('certd.sys.settings.randomAddress')" :name="['hidden', 'openPath']" :required="true">
        <a-input-search v-model:value="formState.hidden.openPath" :allow-clear="true" @search="changeOpenPath">
          <template #enterButton>
            <fs-icon icon="ion:refresh"></fs-icon>
          </template>
        </a-input-search>
        <div class="helper">{{ t("certd.sys.settings.siteHideUrlHelper") }}</div>
      </a-form-item>
      <a-form-item v-if="formState.hidden.enabled" :label="t('certd.sys.settings.fullUnlockUrl')" :name="['hidden', 'openPath']" :required="true">
        <div class="flex"><fs-copyable v-model="openUrl" class="flex-inline"></fs-copyable></div>
        <div class="helper red">{{ t("certd.sys.settings.saveThisUrl") }}</div>
      </a-form-item>
      <a-form-item v-if="formState.hidden.enabled" :label="t('certd.sys.settings.unlockPassword')" :name="['hidden', 'openPassword']" :required="false">
        <a-input-password v-model:value="formState.hidden.openPassword" :allow-clear="true" />
        <div class="helper">{{ t("certd.sys.settings.unlockPasswordHelper") }}</div>
      </a-form-item>
      <a-form-item v-if="formState.hidden.enabled" :label="t('certd.sys.settings.autoHideTime')" :name="['hidden', 'autoHiddenTimes']" :required="true">
        <a-input-number v-model:value="formState.hidden.autoHiddenTimes" :allow-clear="true" />
        <div class="helper">{{ t("certd.sys.settings.autoHideTimeHelper") }}</div>
      </a-form-item>
      <a-form-item v-if="formState.hidden.enabled" :label="t('certd.sys.settings.hideOpenApi')" :name="['hidden', 'hiddenOpenApi']" :required="true">
        <a-switch v-model:checked="formState.hidden.hiddenOpenApi" />
        <div class="helper">{{ t("certd.sys.settings.hideOpenApiHelper") }}</div>
      </a-form-item>
      <a-form-item v-if="formState.hidden.enabled" :label="t('certd.sys.settings.hideSiteImmediately')">
        <loading-button class="ml-1" type="primary" html-type="button" :click="doHiddenImmediate">{{ t("certd.sys.settings.hideImmediately") }}</loading-button>
      </a-form-item>
      <a-form-item label=" " :colon="false" :wrapper-col="{ span: 16 }">
        <loading-button type="primary" html-type="button" :click="onClick">{{ t("certd.common.save") }}</loading-button>
      </a-form-item>
    </a-form>
  </div>
</template>

<script setup lang="tsx">
import { computed, reactive, ref } from "vue";
import { merge } from "lodash-es";
import { Modal, notification } from "ant-design-vue";
import { request } from "/@/api/service";
import { util, utils } from "/@/utils";
import { useSettingStore } from "/@/store/settings";
import { useI18n } from "/src/locales";

const { t } = useI18n();
defineOptions({
  name: "SettingSafe",
});
const settingsStore = useSettingStore();
const api = {
  async SettingGet() {
    return await request({
      url: "/sys/settings/safe/get",
      method: "post",
    });
  },
  async SettingSave(data: any) {
    return await request({
      url: "/sys/settings/safe/save",
      method: "post",
      data,
    });
  },
  async HiddenImmediate() {
    return await request({
      url: "/sys/settings/safe/hidden",
      method: "post",
    });
  },
};

const defaultState = {
  hidden: {
    enabled: false,
    autoHiddenTimes: 5,
    hiddenOpenApi: false,
  },
};
const formRef = ref<any>(defaultState);
type SiteHidden = {
  enabled: boolean;
  openPath?: string;
  autoHiddenTimes?: number;
  openPassword?: string;
  hiddenOpenApi?: boolean;
};

const formState = reactive<
  Partial<{
    hidden: SiteHidden;
  }>
>({
  hidden: { enabled: false },
});

function changeOpenPath() {
  formState.hidden.openPath = util.randomString(16);
}

async function loadSettings() {
  const data: any = await api.SettingGet();
  merge(formState, defaultState, formState, data);
  if (!formState.hidden.openPath) {
    changeOpenPath();
  }
}

loadSettings();

const openUrl = computed(() => {
  const url = new URL(window.location.href);
  url.pathname = `/api/unhidden/${formState.hidden?.openPath || ""}`;
  //@ts-ignore
  url.query = undefined;
  url.hash = "";
  return url.href;
});

const onClick = async () => {
  const form = await formRef.value.validateFields();
  //密码md5
  // if (form.hidden?.openPassword) {
  //   form.hidden.openPassword = util.hash.md5(form.hidden.openPassword);
  // }
  await api.SettingSave(form);
  await loadSettings();
  notification.success({
    message: t("certd.common.saveSuccess"),
  });
};

async function doHiddenImmediate() {
  Modal.confirm({
    title: t("certd.sys.settings.confirmHideSiteTitle"),
    content: t("certd.sys.settings.confirmHideSiteContent"),
    async onOk() {
      await api.HiddenImmediate();
      notification.success({
        message: t("certd.sys.settings.siteHiddenSuccess"),
      });
    },
  });
}
</script>
<style lang="less">
.sys-settings-base {
}
</style>
