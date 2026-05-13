<template>
  <div class="sys-settings-form sys-settings-oauth">
    <a-form :model="formState" name="register" :label-col="{ span: 8 }" :wrapper-col="{ span: 16 }" autocomplete="off" @finish="onFinish">
      <a-form-item :label="t('certd.sys.setting.enablePasskey')" :name="['public', 'passkeyEnabled']">
        <div class="flex-o">
          <a-switch v-model:checked="formState.public.passkeyEnabled" :disabled="!settingsStore.isPlus" :title="t('certd.plusFeature')" />
          <vip-button class="ml-5" mode="button"></vip-button>
        </div>
        <pre class="helper pre">{{ t("certd.sys.setting.passkeyEnabledHelper", [bindDomain]) }}</pre>
        <div v-if="!bindDomainIsSame" class="text-red-500 text-sm mt-2">
          {{ t("certd.sys.setting.passkeyHostnameNotSame") }} <a-button class="ml-2" size="small" type="primary" @click="settingsStore.openBindUrlModal({ closable: true })">{{ t("certd.sys.setting.bindUrl") }}</a-button>
        </div>
      </a-form-item>
      <a-form-item :label="t('certd.sys.setting.enableOauth')" :name="['public', 'oauthEnabled']">
        <div class="flex-o">
          <a-switch v-model:checked="formState.public.oauthEnabled" :disabled="!settingsStore.isPlus" :title="t('certd.plusFeature')" />
          <vip-button class="ml-5" mode="button"></vip-button>
        </div>
      </a-form-item>
      <a-form-item :label="t('certd.sys.setting.oauthProviders')" :name="['public', 'oauthProviders']">
        <div class="flex flex-wrap">
          <table class="w-full table-auto border-collapse border border-gray-400">
            <thead>
              <tr>
                <th class="border border-gray-300 px-4 py-2 w-1/3">{{ t("certd.sys.setting.oauthType") }}</th>
                <th class="border border-gray-300 px-4 py-2 w-1/3">{{ t("certd.sys.setting.oauthCallback") }}</th>
                <th class="border border-gray-300 px-4 py-2 w-1/3">{{ t("certd.sys.setting.oauthConfig") }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(item, key) of oauthProviders" :key="key">
                <td class="border border-gray-300 px-4 py-2">
                  <div class="flex items-center" :title="item.desc">
                    <fs-icon :icon="item.icon" class="mr-2 text-blue-600" />
                    {{ item.title }}
                  </div>
                </td>
                <td class="border border-gray-300 px-4 py-2 overflow-ellipsis" :title="t('certd.sys.setting.oauthCallbackHelper')">
                  <fs-copyable :model-value="buildCallbackUrl(item.name)">
                    {{ t("certd.sys.setting.oauthCallbackCopy") }}
                  </fs-copyable>
                </td>
                <td class="border border-gray-300 px-4 py-2">
                  <AddonSelector
                    v-model:model-value="item.addonId"
                    :disabled="!formState.public.oauthEnabled"
                    addon-type="oauth"
                    from="sys"
                    :type="item.name"
                    :placeholder="t('certd.sys.setting.oauthProviderSelectorPlaceholder')"
                  />
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </a-form-item>
      <a-form-item v-if="formState.public.oauthEnabled" :label="t('certd.sys.setting.oauthOnly')" :name="['public', 'oauthOnly']">
        <div class="flex-o">
          <a-switch v-model:checked="formState.public.oauthOnly" :disabled="!settingsStore.isPlus" :title="t('certd.plusFeature')" />
        </div>
        <div class="helper">{{ t("certd.sys.setting.oauthOnlyHelper") }}</div>
      </a-form-item>
      <a-form-item v-if="formState.public.oauthEnabled" :label="t('certd.sys.setting.oauthAutoRedirect')" :name="['public', 'oauthAutoRedirect']">
        <div class="flex-o">
          <a-switch v-model:checked="formState.public.oauthAutoRedirect" :disabled="!settingsStore.isPlus" :title="t('certd.plusFeature')" />
        </div>
        <div class="helper">{{ t("certd.sys.setting.oauthAutoRedirectHelper") }}</div>
      </a-form-item>
      <a-form-item v-if="formState.public.oauthEnabled" :label="t('certd.sys.setting.oauthAutoRegister')" :name="['public', 'oauthAutoRegister']">
        <div class="flex-o">
          <a-switch
            v-model:checked="formState.public.oauthAutoRegister"
            :checked-children="t('certd.sys.setting.oauthAutoRegisterCheckedText')"
            :un-checked-children="t('certd.sys.setting.oauthAutoRegisterUnCheckedText')"
            :disabled="!settingsStore.isPlus"
            :title="t('certd.plusFeature')"
          />
        </div>
        <div class="helper">{{ t("certd.sys.setting.oauthAutoRegisterHelper") }}</div>
      </a-form-item>
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
import AddonSelector from "../../../certd/addon/addon-selector/index.vue";
import { useSettingStore } from "/@/store/settings";
import * as api from "/@/views/sys/settings/api";
import { SysSettings } from "/@/views/sys/settings/api";
import { useI18n } from "/src/locales";
const { t } = useI18n();

defineOptions({
  name: "SettingOauth",
});

const formState = reactive<Partial<SysSettings>>({
  public: {},
  private: {},
});

const oauthProviders = ref([]);
async function loadOauthProviders() {
  oauthProviders.value = await api.GetOauthProviders();
  mergeOauthProviderSettings();
}

const bindDomain = computed(() => {
  const uri = new URL(settingsStore.installInfo.bindUrl);
  return uri.hostname;
});

const bindDomainIsSame = computed(() => {
  const currentHostname = window.location.hostname;
  return bindDomain.value === currentHostname;
});

function fillOauthProviders(form: any) {
  const providers: any = {};
  for (const item of oauthProviders.value) {
    const type = item.name;
    providers[type] = {
      type: type,
      title: item.title,
      icon: item.icon,
      addonId: item.addonId || null,
    };
  }
  form.public.oauthProviders = providers;
  return providers;
}

async function loadSysSettings() {
  const data: any = await api.SysSettingsGet();
  merge(formState, data);

  await loadOauthProviders();
}

const saveLoading = ref(false);
loadSysSettings();
const settingsStore = useSettingStore();
const onFinish = async (form: any) => {
  try {
    saveLoading.value = true;
    fillOauthProviders(form);
    await api.SysSettingsSave(form);
    await settingsStore.loadSysSettings();
    notification.success({
      message: t("certd.saveSuccess"),
    });
    await loadOauthProviders();
  } finally {
    saveLoading.value = false;
  }
};

function buildCallbackUrl(type: string) {
  return `${window.location.origin}/api/oauth/callback/${type}`;
}

function mergeOauthProviderSettings() {
  const savedProviders = formState.public?.oauthProviders || {};
  for (const item of oauthProviders.value) {
    const saved = savedProviders[item.name];
    if (saved) {
      item.addonId = saved.addonId;
    }
  }
}
</script>
<style lang="less">
.sys-settings-oauth {
  width: 1000px !important;

  .addon-selector {
    .inner {
      justify-content: space-between;
    }
  }
}
</style>
