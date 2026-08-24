<template>
  <a-modal v-model:open="visible" :width="'min(1540px, calc(100vw - 48px))'" :footer="null" destroy-on-close class="online-plugin-detail-modal">
    <a-spin :spinning="loading">
      <iframe v-if="iframeSrc" ref="iframeRef" class="online-plugin-detail-modal__iframe" :src="iframeSrc" @load="handleIframeLoad" />
      <a-empty v-else description="插件详情地址未配置" />
    </a-spin>
  </a-modal>
</template>

<script lang="tsx" setup>
import { computed, nextTick, onBeforeUnmount, ref, watch } from "vue";
import { Modal, notification } from "ant-design-vue";
import { IframeClient } from "@certd/lib-iframe";
import { fullNameValueFor, useOnlineInstall } from "../use-online-install";
import { useSettingStore } from "/src/store/settings";
import { useI18n } from "/src/locales";

const props = defineProps<{
  open: boolean;
  plugin?: any;
}>();

const emit = defineEmits<{
  (e: "update:open", value: boolean): void;
  (e: "installed", value: { plugin: any; version?: string }): void;
}>();

const settingStore = useSettingStore();
const { t } = useI18n();
const { resolveOnlinePluginDependencies, installOnlinePluginChain, openDependencyDetail } = useOnlineInstall();
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
    installedVersion: plugin.version || "",
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
  const plugin = { ...props.plugin, fullName };
  let dependencies: any[] = [];
  try {
    dependencies = await resolveOnlinePluginDependencies(plugin);
  } catch (error: any) {
    if (error instanceof Error && error.message.includes(t("certd.onlinePluginDependencyNotFound"))) {
      // 依赖插件未同步到本地市场列表时，明确弹窗引导先同步
      Modal.warning({
        title: t("certd.onlinePluginDependencyNotFound"),
        content: `${error.message}，请先同步插件市场，确认依赖插件已发布后再安装`,
        okText: t("certd.confirm"),
      });
      return;
    }
    notification.error({ message: error.message || String(error) });
    return;
  }

  if (dependencies.length > 0) {
    // 先弹窗确认安装依赖，再安装指定版本的目标插件
    await new Promise<void>((resolve, reject) => {
      Modal.confirm({
        title: t("certd.onlinePluginDependenciesTitle"),
        content: (
          <div class="plugin-dependency-confirm">
            <div>{t("certd.onlinePluginDependenciesPrompt")}</div>
            <ul class="plugin-dependency-confirm__list">
              {dependencies.map(item => (
                <li key={fullNameValueFor(item)}>
                  <a
                    class="plugin-dependency-confirm__item"
                    onClick={(event: MouseEvent) => {
                      event.stopPropagation();
                      openDependencyDetail(item);
                    }}
                  >
                    {item.title || item.name || item.fullName} ({fullNameValueFor(item)})
                  </a>
                </li>
              ))}
            </ul>
          </div>
        ),
        okText: t("certd.onlinePluginInstallDependencies"),
        cancelText: t("certd.cancel"),
        async onOk() {
          try {
            await installOnlinePluginChain(dependencies, plugin, { version: data.version });
            resolve();
          } catch (error: any) {
            // 依赖安装失败时给出明确错误提示，并保持弹窗打开便于重试
            notification.error({ message: error.message || String(error) });
            reject(error);
          }
        },
        onCancel() {
          reject(new Error("已取消安装"));
        },
      });
    });
  } else {
    await installOnlinePluginChain([], plugin, { version: data.version });
  }
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
