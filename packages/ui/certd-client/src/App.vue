<template>
  <AConfigProvider :locale="antdvLocale" :theme="tokenTheme">
    <FsFormProvider>
      <contextHolder />
      <router-view />
    </FsFormProvider>
  </AConfigProvider>
</template>

<script lang="ts" setup>
import { computed, provide, Ref, ref } from "vue";
import { preferences, usePreferences } from "/@/vben/preferences";
import { useAntdDesignTokens } from "/@/vben/hooks";
import { Modal, theme } from "ant-design-vue";
import AConfigProvider from "ant-design-vue/es/config-provider";
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
const { tokens } = useAntdDesignTokens();

const tokenTheme = computed(() => {
  const algorithm = isDark.value ? [theme.darkAlgorithm] : [theme.defaultAlgorithm];

  // antd 紧凑模式算法
  if (preferences.app.compact) {
    algorithm.push(theme.compactAlgorithm);
  }

  return {
    algorithm,
    token: tokens,
  };
});
</script>
