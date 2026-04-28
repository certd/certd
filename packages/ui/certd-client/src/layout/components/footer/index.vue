<template>
  <div class="flex flex-between w-full text-sm p-5 bg-neutral-100 dark:bg-neutral-900">
    <div class="flex items-center">
      <span v-if="!settingStore.isComm">
        <span>Powered by</span>
        <a href="https://certd.docmirror.cn/" target="_blank"> handfree.work </a>
        <a-divider type="vertical" />
      </span>

      <template v-if="siteInfo.licenseTo">
        <a :href="siteInfo.licenseToUrl || ''">{{ siteInfo.licenseTo }}</a>
        <a-divider type="vertical" />
      </template>

      <template v-if="sysPublic.icpNo">
        <span>
          <a href="https://beian.miit.gov.cn/" target="_blank">{{ sysPublic.icpNo }}</a>
          <a-divider type="vertical" />
        </span>
      </template>

      <span v-if="sysPublic.mpsNo">
        <a href="http://www.beian.gov.cn/portal/registerSystemInfo" target="_blank">{{ sysPublic.mpsNo }}</a>
        <a-divider type="vertical" />
      </span>

      <template v-if="sysPublic.customFooter && settingStore.isPlus">
        <div v-html="sysPublic.customFooter"></div>
      </template>
    </div>
    <div class="ml-5">v{{ version }}</div>
  </div>
</template>
<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { useSettingStore } from "/@/store/settings";

defineOptions({
  name: "PageFooter",
});
const version = ref(import.meta.env.VITE_APP_VERSION);

const settingStore = useSettingStore();

const sysPublic = computed(() => {
  return settingStore.sysPublic;
});
const siteInfo = computed(() => {
  return settingStore.siteInfo;
});
</script>
