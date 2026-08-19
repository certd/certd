<template>
  <a-modal v-model:open="visible" :width="'min(1540px, calc(100vw - 48px))'" :footer="null" destroy-on-close class="online-plugin-detail-modal">
    <a-spin :spinning="loading">
      <iframe v-if="iframeSrc" ref="iframeRef" class="online-plugin-detail-modal__iframe" :src="iframeSrc" @load="handleIframeLoad" />
      <a-empty v-else description="插件详情地址未配置" />
    </a-spin>
  </a-modal>
</template>

<script lang="ts" setup>
import { computed, nextTick, onBeforeUnmount, ref, watch } from "vue";
import { notification } from "ant-design-vue";
import { IframeClient } from "@certd/lib-iframe";
import * as api from "../api";
import { usePluginStore } from "/@/store/plugin";
import { useSettingStore } from "/src/store/settings";

const props = defineProps<{
  open: boolean;
  plugin?: any;
}>();

const emit = defineEmits<{
  (e: "update:open", value: boolean): void;
  (e: "installed", value: { plugin: any; version?: string }): void;
}>();

const pluginStore = usePluginStore();
const settingStore = useSettingStore();
const iframeRef = ref<HTMLIFrameElement>();
const loading = ref(false);
const visible = computed({
  get: () => props.open,
  set: value => emit("update:open", value),
});
const iframeSrc = computed(() => {
  const plugin = props.plugin;
  if (!plugin) {
    return "";
  }
  const baseUrl = String(settingStore.installInfo?.accountServerBaseUrl || "").replace(/\/$/, "");
  if (!baseUrl) {
    return "";
  }
  const params = new URLSearchParams({
    embedded: "true",
    fullName: plugin.fullName || "",
    installedVersion: plugin.installedVersion || "",
    t: `${Date.now()}`,
  });
  return `${baseUrl}/#/app/certd/plugin/${plugin.id || 0}?${params.toString()}`;
});

let iframeClient: IframeClient = undefined;

watch(
  () => props.open,
  async open => {
    if (!open || !props.plugin) {
      loading.value = false;
      return;
    }
    loading.value = true;
    await nextTick();
    setupIframeClient();
    if (!iframeSrc.value) {
      loading.value = false;
    }
  },
  { immediate: true }
);

onBeforeUnmount(() => {
  //@ts-ignore
  iframeClient?.destroy();
});

function setupIframeClient() {
  //@ts-ignore
  iframeClient?.destroy();
  if (!iframeRef.value) {
    return;
  }
  iframeClient = new IframeClient(iframeRef.value, (error: any) => {
    notification.error({ message: error?.message || "插件操作失败" });
  });
  iframeClient.register("installPlugin", async req => {
    return await installPluginVersion(req.data);
  });
}

function handleIframeLoad() {
  loading.value = false;
}

async function installPluginVersion(data: { fullName?: string; version?: string }) {
  const fullName = data?.fullName || props.plugin?.fullName;
  if (!fullName || !data?.version) {
    throw new Error("插件版本信息不完整");
  }
  await api.OnlinePluginInstall({
    fullName,
    version: data.version,
  });
  await pluginStore.reload();
  emit("installed", {
    plugin: props.plugin,
    version: data.version,
  });
  return {
    version: data.version,
  };
}
</script>

<style lang="less">
.online-plugin-detail-modal {
  .ant-modal-body {
    height: 80vh;
    padding: 0;
    overflow: hidden;
  }

  .ant-spin-nested-loading,
  .ant-spin-container {
    height: 100%;
  }

  &__iframe {
    display: block;
    width: 100%;
    height: 80vh;
    border: 0;
  }
}
</style>
