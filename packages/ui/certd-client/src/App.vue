<template>
  <AConfigProvider :locale="antdvLocale" :theme="tokenTheme">
    <FnConfigProvider ui="antdv" :theme-bridge="FnAntdvThemeBridge">
      <FsFormProvider>
        <contextHolder />
        <router-view />
      </FsFormProvider>
    </FnConfigProvider>
  </AConfigProvider>
</template>

<script lang="ts" setup>
import { computed, defineComponent, provide, Ref, ref } from "vue";
import { preferences, usePreferences } from "/@/vben/preferences";
import { Modal, theme } from "ant-design-vue";
import AConfigProvider from "ant-design-vue/es/config-provider";
import { FnConfigProvider } from "/@/components/table";
import { useAntdvTheme } from "/@/components/table/theme";
import { antdvLocale } from "./locales/antdv";
import { setI18nLanguage } from "/@/locales";
import { mitter } from "./utils/util.mitt";
defineOptions({
  name: "App",
});

const [modal, contextHolder] = Modal.useModal();
provide("modal", modal);
mitter.on("getModal", (event: any) => {
  event.ModalRef = modal;
});

const locale = preferences.app.locale;
setI18nLanguage(locale);

const { isDark } = usePreferences();
const FnAntdvThemeBridge = defineComponent({
  name: "FnAntdvThemeBridge",
  setup() {
    const { token } = theme.useToken();
    useAntdvTheme(token);
    return () => null;
  },
});

const tokenTheme = computed(() => {
  const algorithm = isDark.value ? [theme.darkAlgorithm] : [theme.defaultAlgorithm];

  // antd 紧凑模式算法
  if (preferences.app.compact) {
    algorithm.push(theme.compactAlgorithm);
  }

  return {
    algorithm,
  };
});
</script>
