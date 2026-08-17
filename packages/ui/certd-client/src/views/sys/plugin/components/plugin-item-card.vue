<template>
  <a-card
    hoverable
    class="plugin-card plugin-item-card"
    :class="{
      current,
      'is-simple': simple,
      'is-local': source === 'local',
      'is-installed': isInstalled,
      'is-disabled': isDisabled,
    }"
    @click="handleCardClick"
    @dblclick="handleCardDoubleClick"
  >
    <div class="plugin-card__head">
      <div class="plugin-card__main">
        <fs-icon class="plugin-icon plugin-card__icon" :icon="plugin.icon || 'clarity:plugin-line'" />
        <div class="plugin-card__title-wrap">
          <a v-if="showEditButton" class="plugin-card__title" :title="plugin.title || plugin.name" href="#" @click.stop.prevent="editPlugin">
            {{ plugin.title || plugin.name }}
          </a>
          <span v-else class="plugin-card__title" :title="plugin.title || plugin.name">{{ plugin.title || plugin.name }}</span>
          <a-tooltip v-if="plugin.aiCheckStatus === 'passed'" :title="t('certd.onlinePluginAiReviewPassed')">
            <fs-icon class="plugin-card__ai-check-icon" icon="ion:shield-checkmark-outline" />
          </a-tooltip>
          <a-tooltip v-if="requiresVip" title="需要 Plus 会员">
            <fs-icon class="plugin-card__vip-icon" icon="mingcute:vip-1-line" />
          </a-tooltip>
        </div>
      </div>
      <div class="plugin-card__actions">
        <div v-if="showEditButton || showConfigButton || showToolMenu" class="plugin-card__tools">
          <a-tooltip v-if="showEditButton" title="编辑">
            <a-button class="plugin-card__tool" type="text" size="small" @click.stop="editPlugin">
              <template #icon>
                <fs-icon icon="ion:create-outline" />
              </template>
            </a-button>
          </a-tooltip>
          <a-tooltip v-if="copyHandler && canCopyPlugin" title="复制">
            <a-button class="plugin-card__tool" type="text" size="small" @click.stop="copyPlugin">
              <template #icon>
                <fs-icon icon="ion:copy-outline" />
              </template>
            </a-button>
          </a-tooltip>
          <a-tooltip v-if="isOwnImportedPlugin" :title="t('certd.export')">
            <a-button class="plugin-card__tool" type="text" size="small" @click.stop="exportPlugin">
              <template #icon>
                <fs-icon icon="ion:download-outline" />
              </template>
            </a-button>
          </a-tooltip>
          <a-tooltip v-if="canPublishPlugin" :title="t('certd.onlinePluginPublish')">
            <a-button class="plugin-card__tool" type="text" size="small" :loading="isPublishingPlugin(plugin)" @click.stop="publishPlugin">
              <template #icon>
                <fs-icon icon="ion:cloud-upload-outline" />
              </template>
            </a-button>
          </a-tooltip>
          <a-tooltip v-if="showConfigButton" title="配置">
            <a-button class="plugin-card__tool" type="text" size="small" @click.stop="openConfig">
              <template #icon>
                <fs-icon icon="ion:settings-outline" />
              </template>
            </a-button>
          </a-tooltip>
        </div>
        <div v-if="source === 'local' && canRemoveLocal" class="plugin-card__action-zone plugin-card__local-action-zone">
          <a-tooltip title="删除">
            <a-button class="plugin-card__action-button" type="text" size="small" danger :loading="isActionLoading('remove')" @click.stop="removePlugin">
              <template #icon>
                <fs-icon icon="ion:trash-outline" />
              </template>
            </a-button>
          </a-tooltip>
        </div>
        <template v-else-if="plugin.installed && source !== 'local'">
          <div v-if="plugin.localPluginId" class="plugin-card__action-zone" :class="{ 'is-loading': isActionLoading('uninstall') }">
            <a-tag color="green" class="plugin-status-tag">{{ t("certd.onlinePluginInstalled") }}</a-tag>
            <a-button class="plugin-card__action-button" size="small" danger ghost :loading="isActionLoading('uninstall')" @click.stop="uninstallPlugin">
              {{ t("certd.onlinePluginUninstall") }}
            </a-button>
          </div>
          <a-tag v-else color="green" class="plugin-status-tag">{{ t("certd.onlinePluginInstalled") }}</a-tag>
        </template>
        <div v-else-if="source !== 'local'" class="plugin-card__action-zone plugin-card__install-zone" :class="{ 'is-loading': isActionLoading('install') }">
          <a-button class="plugin-card__action-button" size="small" type="primary" :loading="isActionLoading('install')" @click.stop="installPlugin">
            {{ t("certd.onlinePluginInstall") }}
          </a-button>
        </div>
      </div>
    </div>

    <div class="plugin-card__desc" :title="plugin.desc">
      {{ plugin.desc || "暂无描述" }}
    </div>

    <div class="plugin-card__meta">
      <template v-if="source === 'local'">
        <a-tooltip :title="toggleTitle">
          <a-tag class="plugin-status-tag" :class="{ 'is-loading': isActionLoading('toggle') }" :color="plugin.disabled ? 'default' : 'green'" @click.stop="togglePlugin">
            {{ plugin.disabled ? t("certd.onlinePluginDisabled") : t("certd.onlinePluginEnabled") }}
          </a-tag>
        </a-tooltip>
        <a-tag>{{ pluginTypeLabel }}</a-tag>
        <a-tag>{{ sourceLabel }}</a-tag>
        <a-tag v-if="plugin.group">{{ plugin.group }}</a-tag>
      </template>
      <template v-else-if="!simple">
        <a-tooltip v-if="plugin.installed && plugin.localPluginId" :title="toggleTitle">
          <a-tag class="plugin-status-tag" :class="{ 'is-loading': isActionLoading('toggle') }" :color="plugin.localDisabled ? 'default' : 'green'" @click.stop="togglePlugin">
            {{ plugin.localDisabled ? t("certd.onlinePluginDisabled") : t("certd.onlinePluginEnabled") }}
          </a-tag>
        </a-tooltip>
        <a-tag>{{ pluginTypeLabel }}</a-tag>
        <a-tag v-if="plugin.group">{{ plugin.group }}</a-tag>
        <a-tooltip :title="t('certd.onlinePluginDownloadCount', { count: plugin.downloadCount || 0 })">
          <a-tag class="plugin-card__download-count">
            <fs-icon icon="ion:cloud-download-outline" />
            <span>{{ formatDownloadCount(plugin.downloadCount || 0) }}</span>
          </a-tag>
        </a-tooltip>
        <a-tooltip :title="`平均评分 ${formatScore(plugin.score)} 星`">
          <a-tag class="plugin-card__score">
            <fs-icon icon="ion:star" />
            <span>{{ formatScore(plugin.score) }}</span>
          </a-tag>
        </a-tooltip>
      </template>
      <a-tooltip v-if="!isBuiltInPlugin" :title="versionTitle">
        <span class="plugin-card__version" :class="{ 'is-upgradable': plugin.upgradeAvailable }" @click.stop="handleVersionClick">
          v{{ currentVersion }}
          <fs-icon v-if="plugin.upgradeAvailable" class="plugin-card__version-icon" icon="carbon:upgrade" />
        </span>
      </a-tooltip>
      <a-tooltip v-if="source !== 'local' && authorName" :title="plugin.selfAuthored ? '这是我自己提交的插件' : `${t('certd.author')}：${authorName}`">
        <span class="plugin-card__author" :class="{ 'is-self-authored': plugin.selfAuthored }">
          <fs-icon :icon="plugin.selfAuthored ? 'ion:person-circle' : 'ion:person-circle-outline'" />
          <span>{{ authorName }}</span>
        </span>
      </a-tooltip>
    </div>
  </a-card>
</template>

<script lang="ts" setup>
import { computed, h, ref } from "vue";
import { message, Modal } from "ant-design-vue";
import { useFormDialog } from "/@/use/use-dialog";
import { useI18n } from "/src/locales";
import { usePluginStore } from "/@/store/plugin";
import * as api from "../api";
import { usePluginConfig } from "../use-config";
import { usePluginPublish } from "../use-publish";
import PluginEditDialogBody from "./plugin-edit-dialog-body.vue";

defineOptions({
  name: "PluginItemCard",
});

const props = withDefaults(
  defineProps<{
    plugin: any;
    source?: "local" | "market";
    current?: boolean;
    simple?: boolean;
    showConfig?: boolean;
    editable?: boolean;
    copyHandler?: (plugin: any) => void | Promise<void>;
  }>(),
  {
    source: "market",
    copyHandler: undefined,
  }
);

const emit = defineEmits<{
  (e: "click", plugin: any): void;
  (e: "dblclick", plugin: any): void;
  (e: "changed", payload: { plugin: any; action: PluginCardAction }): void;
}>();

const { t } = useI18n();
const pluginStore = usePluginStore();
const { openConfigDialog } = usePluginConfig();
const { isPublishingPlugin, publishLocalPlugin } = usePluginPublish();
const { openFormDialog } = useFormDialog();
const actionLoading = ref<PluginCardAction | "">("");
const editDialogBodyRef = ref();

type PluginCardAction = "edit" | "copy" | "export" | "publish" | "config" | "install" | "uninstall" | "remove" | "toggle";

const editPluginId = computed(() => {
  return props.plugin.localPluginId || props.plugin.id;
});

const canEditPlugin = computed(() => {
  if (props.editable != null) {
    return props.editable;
  }
  return props.plugin.type === "custom";
});

const isOwnImportedPlugin = computed(() => {
  return props.source === "local" && canEditPlugin.value;
});

const isAvailableLocally = computed(() => {
  return props.source === "local" || !!props.plugin.installed;
});

const canCopyPlugin = computed(() => {
  return isOwnImportedPlugin.value || (props.source === "market" && !!props.plugin.selfAuthored && isAvailableLocally.value);
});

const showEditButton = computed(() => {
  return canEditPlugin.value && isAvailableLocally.value;
});

const showConfigButton = computed(() => {
  return !!props.showConfig && isAvailableLocally.value;
});

const isInstalled = computed(() => {
  return props.source !== "local" && props.plugin.installed;
});

const isDisabled = computed(() => {
  return props.source === "local" ? props.plugin.disabled : props.plugin.localDisabled;
});

const requiresVip = computed(() => {
  return props.plugin.vip === "plus" || props.plugin.needPlus === true;
});

const canRemoveLocal = computed(() => {
  return isOwnImportedPlugin.value;
});

const isBuiltInPlugin = computed(() => {
  return props.source === "local" && props.plugin.type === "builtIn";
});

const canPublishPlugin = computed(() => {
  return canEditPlugin.value && isAvailableLocally.value && (!props.plugin.status || !!props.plugin.selfAuthored);
});

const showToolMenu = computed(() => {
  return !isBuiltInPlugin.value && (isOwnImportedPlugin.value || canPublishPlugin.value);
});

const fullName = computed(() => {
  if (props.plugin.fullName) {
    return props.plugin.fullName;
  }
  if (props.plugin.author && props.plugin.name) {
    return `${props.plugin.author}/${props.plugin.name}`;
  }
  return props.plugin.name || "";
});

const authorName = computed(() => {
  if (props.plugin.author) {
    return props.plugin.author;
  }
  const [author] = fullName.value.split("/");
  return author || "";
});

const pluginTypeLabel = computed(() => {
  const labelMap: Record<string, string> = {
    access: t("certd.auth"),
    dnsProvider: t("certd.dns"),
    deploy: t("certd.deployPlugin"),
  };
  return labelMap[props.plugin.pluginType || ""] || props.plugin.pluginType || "-";
});

const sourceLabel = computed(() => {
  if (props.source === "local" && props.plugin.type !== "builtIn") {
    return t("certd.localPlugin");
  }
  const labelMap: Record<string, string> = {
    builtIn: t("certd.builtIn"),
    custom: t("certd.custom"),
    store: t("certd.store"),
  };
  return labelMap[props.plugin.type || ""] || props.plugin.type || "-";
});

const currentVersion = computed(() => {
  if (props.source === "local") {
    return props.plugin.version || props.plugin.latest || "-";
  }
  return props.plugin.installedVersion || props.plugin.latest || "-";
});

const versionTitle = computed(() => {
  if (props.source === "local") {
    return `${t("certd.version")} v${currentVersion.value}`;
  }
  if (props.plugin.installedVersion && props.plugin.upgradeAvailable && props.plugin.latest) {
    return `${t("certd.dashboard.latestVersion", { version: `v${props.plugin.latest}` })}，${t("certd.onlinePluginClickToUpdate")}`;
  }
  if (props.plugin.installedVersion) {
    return t("certd.onlinePluginAlreadyLatest");
  }
  if (props.plugin.latest) {
    return t("certd.dashboard.latestVersion", { version: `v${props.plugin.latest}` });
  }
  return `${t("certd.version")} -`;
});

const toggleTitle = computed(() => {
  const disabled = props.source === "local" ? props.plugin.disabled : props.plugin.localDisabled;
  return disabled ? t("certd.onlinePluginClickToEnable") : t("certd.onlinePluginClickToDisable");
});

function isActionLoading(action: PluginCardAction) {
  return actionLoading.value === action;
}

function handleCardClick() {
  if (props.source === "local") {
    if (showEditButton.value) {
      void editPlugin();
    }
    return;
  }
  emit("click", props.plugin);
}

function handleCardDoubleClick() {
  if (props.source !== "local") {
    emit("dblclick", props.plugin);
  }
}

function emitChanged(action: PluginCardAction) {
  emit("changed", {
    plugin: props.plugin,
    action,
  });
}

async function runAction(action: PluginCardAction, callback: () => Promise<void>, options?: { emitChanged?: boolean }) {
  if (actionLoading.value) {
    return;
  }
  actionLoading.value = action;
  try {
    await callback();
    if (options?.emitChanged !== false) {
      emitChanged(action);
    }
  } finally {
    actionLoading.value = "";
  }
}

async function editPlugin() {
  await openFormDialog({
    title: `编辑插件 ${props.plugin.title || props.plugin.name}`,
    columns: {},
    noneForm: true,
    className: "plugin-edit-dialog",
    wrapper: {
      width: 1480,
      destroyOnClose: true,
      maskClosable: false,
      okText: "保存",
      cancelText: "关闭",
    },
    body: () =>
      h(PluginEditDialogBody, {
        ref: editDialogBodyRef,
        pluginId: editPluginId.value,
      }),
    async onSubmit() {
      await editDialogBodyRef.value?.save?.();
      emitChanged("edit");
    },
  });
}

async function copyPlugin() {
  if (!props.copyHandler) {
    return;
  }
  await runAction(
    "copy",
    async () => {
      await props.copyHandler?.(props.plugin);
    },
    { emitChanged: true }
  );
}

async function exportPlugin() {
  await runAction(
    "export",
    async () => {
      const content = await api.ExportPlugin(props.plugin.id);
      if (!content) {
        return;
      }
      const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${props.plugin.name}.yaml`;
      link.click();
      URL.revokeObjectURL(url);
    },
    { emitChanged: false }
  );
}

async function publishPlugin() {
  await publishLocalPlugin(
    { ...props.plugin, id: editPluginId.value },
    {
      async afterPublish() {
        emitChanged("publish");
      },
    }
  );
}

async function openConfig() {
  await openConfigDialog({
    row: props.plugin,
    onSuccess: async () => {
      emitChanged("config");
    },
  });
}

async function installPlugin() {
  const fullName = fullNameValue();
  if (!fullName) {
    return;
  }
  try {
    await runAction("install", async () => {
      await api.OnlinePluginInstall(
        {
          fullName,
          version: props.plugin.latest,
        },
        {
          showErrorNotify: false,
        }
      );
      message.success(t("certd.onlinePluginInstallSuccess"));
    });
  } catch (error: any) {
    if (!isOnlinePluginMissing(error)) {
      throw error;
    }
    confirmRemoveMissingOnlinePlugin();
  }
}

function isOnlinePluginMissing(error: unknown) {
  return error instanceof Error && error.message.includes("插件不存在");
}

function confirmRemoveMissingOnlinePlugin() {
  if (!props.plugin.id) {
    return;
  }
  Modal.confirm({
    title: "插件不存在",
    content: `在线市场已找不到插件「${fullNameValue() || props.plugin.title || props.plugin.name}」，是否删除本地同步的插件记录？`,
    okText: "删除插件",
    cancelText: "保留记录",
    okButtonProps: { danger: true },
    async onOk() {
      await runAction("remove", async () => {
        await api.DelObj(props.plugin.id);
        await pluginStore.reload();
        message.success("插件记录已删除");
      });
    },
  });
}

function uninstallPlugin() {
  if (!props.plugin.localPluginId) {
    return;
  }
  Modal.confirm({
    title: t("certd.confirm"),
    content: t("certd.onlinePluginDeleteConfirm", { name: fullNameValue() || props.plugin.title || props.plugin.name }),
    async onOk() {
      await runAction("uninstall", async () => {
        await api.OnlinePluginUninstall(props.plugin.localPluginId);
        await pluginStore.reload();
        message.success(t("certd.onlinePluginUninstallSuccess"));
      });
    },
  });
}

function removePlugin() {
  if (!props.plugin.id) {
    return;
  }
  Modal.confirm({
    title: t("certd.confirm"),
    content: "确定要删除吗？如果该插件已被使用，删除可能会导致流水线执行失败！",
    async onOk() {
      await runAction("remove", async () => {
        await api.DelObj(props.plugin.id);
        message.success(t("certd.onlinePluginUninstallSuccess"));
      });
    },
  });
}

function togglePlugin() {
  const id = props.source === "local" ? props.plugin.id : props.plugin.localPluginId;
  const canToggleBuiltInPlugin = props.source === "local" && props.plugin.type === "builtIn" && !!props.plugin.name;
  if (!id && !canToggleBuiltInPlugin) {
    return;
  }
  Modal.confirm({
    title: t("certd.confirm"),
    content: `${t("certd.confirmToggle")} ${isDisabled.value ? t("certd.enable") : t("certd.disable")}?`,
    maskClosable: true,
    async onOk() {
      await runAction("toggle", async () => {
        await api.SetDisabled({
          id: id || undefined,
          name: props.plugin.name,
          type: props.source === "local" ? props.plugin.type : "store",
          disabled: !isDisabled.value,
        });
        await pluginStore.reload();
        message.success(t("certd.operationSuccess"));
      });
    },
  });
}

function fullNameValue() {
  return fullName.value;
}

function formatDownloadCount(count: number) {
  if (count >= 10000) {
    return `${(count / 10000).toFixed(1).replace(/\.0$/, "")}w`;
  }
  return `${count}`;
}

function formatScore(score?: number) {
  const value = Number(score || 0);
  if (!Number.isFinite(value)) {
    return "0";
  }
  return value.toFixed(1).replace(/\.0$/, "");
}

function handleVersionClick() {
  if (props.source === "local" || !props.plugin.upgradeAvailable) {
    return;
  }
  Modal.confirm({
    title: "升级插件",
    content: `确认将 ${props.plugin.title || props.plugin.name} 升级到 v${props.plugin.latest} 吗？`,
    okText: "确认升级",
    cancelText: "取消",
    async onOk() {
      await installPlugin();
    },
  });
}
</script>

<style lang="less">
.plugin-item-card.plugin-card {
  width: 100%;
  border-color: #e5eaf1;
  border-radius: 8px;
  background: linear-gradient(180deg, #ffffff 0%, #fbfdff 100%);
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.04);
  transition-duration: 160ms;
  transition-property: border-color, box-shadow, transform, opacity;
  transition-timing-function: ease-out;

  &:hover {
    border-color: #7dc4ff;
    box-shadow: 0 8px 24px rgba(15, 23, 42, 0.08);
    transform: translateY(-1px);
  }

  &.current {
    border-color: #00b7ff;
    box-shadow:
      0 0 0 2px rgba(0, 183, 255, 0.1),
      0 8px 24px rgba(15, 23, 42, 0.08);
  }

  &.is-installed {
    background: linear-gradient(180deg, #ffffff 0%, #f8fffb 100%);
  }

  &.is-disabled {
    opacity: 0.72;
  }

  .plugin-status-tag {
    box-sizing: border-box;
    flex: none;
    margin: 0;
    border-radius: 6px;
    font-size: 12px;
    font-weight: 500;
    line-height: 24px;
    cursor: pointer;
  }

  .ant-card-body {
    display: flex;
    min-height: 148px;
    flex-direction: column;
    padding: 14px 16px 8px;
  }

  .plugin-card__head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
  }

  .plugin-card__main {
    display: flex;
    min-width: 0;
    flex: 1;
    align-items: center;
  }

  .plugin-card__icon {
    flex: none;
    margin-top: 0;
  }

  .plugin-card__main .plugin-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 22px;
    height: 22px;
    flex-shrink: 0;
    color: #00b7ff;
    font-size: 22px;
    line-height: 22px;
  }

  .plugin-card__title-wrap {
    display: flex;
    min-width: 0;
    flex: 1;
    align-items: center;
    gap: 4px;
    margin-left: 8px;
  }

  .plugin-card__vip-icon {
    flex: none;
    color: #faad14;
    font-size: 16px;
    line-height: 1;
  }

  .plugin-card__title {
    display: block;
    min-width: 0;
    flex: 0 1 auto;
    max-width: 100%;
    overflow: hidden;
    color: #1f2937;
    font-size: 14px;
    font-weight: 600;
    line-height: 22px;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  a.plugin-card__title:hover {
    color: #1677ff;
  }

  .plugin-card__author {
    display: inline-flex;
    max-width: 100%;
    align-items: center;
    gap: 3px;
    margin-left: auto;
    overflow: hidden;
    color: #8c8c8c;
    font-size: 12px;
    line-height: 18px;

    .fs-icon {
      flex: none;
      font-size: 13px;
      line-height: 1;
    }

    span {
      min-width: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    &.is-self-authored {
      color: #1677ff;

      .fs-icon {
        color: #1677ff;
      }
    }
  }

  .plugin-card__actions {
    display: flex;
    min-width: max-content;
    flex: none;
    align-items: center;
    justify-content: flex-end;
    gap: 8px;
    padding-top: 1px;
  }

  .plugin-card__tools {
    display: flex;
    flex: none;
    align-items: center;
    gap: 1px;
  }

  .plugin-card__tool {
    display: inline-flex;
    width: 24px;
    height: 24px;
    align-items: center;
    justify-content: center;
    padding: 0;
    border-radius: 6px;
    color: #5f6b7a;
    opacity: 0.68;
    transition-duration: 160ms;
    transition-property: color, background-color, opacity, transform;
    transition-timing-function: ease-out;

    .fs-icon {
      display: flex;
      width: 16px;
      height: 16px;
      flex: none;
      align-items: center;
      justify-content: center;
      font-size: 15px;
      line-height: 1;
    }

    &:hover {
      color: #1677ff;
      opacity: 1;
      background: rgba(22, 119, 255, 0.08);
      transform: translateY(-1px);
    }
  }

  .plugin-card__action-zone {
    position: relative;
    width: 68px;
    height: 28px;
    flex: none;

    .plugin-status-tag,
    .plugin-card__action-button {
      position: absolute;
      inset: 0;
      display: flex;
      height: 28px;
      align-items: center;
      justify-content: center;
      margin: 0;
      padding: 0 8px;
      border-radius: 6px;
      font-size: 12px;
      line-height: 26px;
      transition-duration: 160ms;
      transition-property: opacity, transform, filter;
      transition-timing-function: ease-out;
    }

    .plugin-status-tag {
      opacity: 1;
      transform: translateY(0) scale(1);
    }

    .plugin-card__action-button {
      opacity: 0;
      pointer-events: none;
      transform: translateY(4px) scale(0.96);
      filter: blur(2px);
    }

    &.is-loading,
    &:hover {
      .plugin-status-tag {
        opacity: 0;
        transform: translateY(-4px) scale(0.96);
        filter: blur(2px);
      }

      .plugin-card__action-button {
        opacity: 1;
        pointer-events: auto;
        transform: translateY(0) scale(1);
        filter: blur(0);
      }
    }
  }

  .plugin-card__local-action-zone {
    width: 28px;

    .plugin-card__action-button {
      opacity: 1;
      pointer-events: auto;
      transform: translateY(0) scale(1);
      filter: blur(0);
    }
  }

  .plugin-card__install-zone {
    width: 68px;

    .plugin-card__action-button {
      opacity: 1;
      pointer-events: auto;
      transform: translateY(0) scale(1);
      filter: blur(0);
    }
  }

  .plugin-card__desc {
    display: -webkit-box;
    min-height: 40px;
    margin-top: 8px;
    margin-bottom: 8px;
    overflow: hidden;
    color: #5f6b7a;
    font-size: 12px;
    line-height: 20px;
    text-wrap: pretty;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 2;
  }

  .plugin-card__meta {
    display: flex;
    min-width: 0;
    flex-wrap: wrap;
    align-items: center;
    gap: 6px;
    margin-top: auto;
    padding-top: 12px;
    border-top: 1px solid #eef2f7;

    .ant-tag {
      margin: 0;
      border-radius: 6px;
      font-size: 12px;
      line-height: 20px;
    }
  }

  .plugin-card__version {
    display: inline-flex;
    align-items: center;
    gap: 3px;
    color: #8c8c8c;
    font-size: 12px;
    font-variant-numeric: tabular-nums;
    line-height: 22px;

    &.is-upgradable {
      color: #1677ff;
      cursor: pointer;

      &:hover {
        color: #0958d9;
      }
    }
  }

  .plugin-card__version-icon {
    font-size: 13px;
    line-height: 1;
  }

  .plugin-card__download-count {
    display: inline-flex;
    align-items: center;
    gap: 3px;
    color: #6b7280;

    .fs-icon {
      font-size: 13px;
      line-height: 1;
    }
  }

  .plugin-card__score {
    display: inline-flex;
    align-items: center;
    gap: 3px;
    color: #d48806;

    .fs-icon {
      color: #faad14;
      font-size: 13px;
      line-height: 1;
    }
  }

  .plugin-card__ai-check-icon {
    flex: none;
    color: #52c41a;
    font-size: 16px;
    line-height: 1;
  }

  &.is-simple {
    .ant-card-body {
      min-height: 128px;
    }

    .plugin-card__desc {
      min-height: 40px;
      margin-bottom: 4px;
      -webkit-line-clamp: 2;
    }

    .plugin-card__meta {
      min-height: 24px;
      margin-top: 0;
      padding-top: 4px;
    }

    .plugin-card__version {
      min-height: 22px;
      line-height: 22px;
    }
  }
}

.dark {
  .plugin-item-card.plugin-card {
    border-color: #303030;
    background: #1f1f1f;
    color: rgba(255, 255, 255, 0.85);

    &:hover {
      border-color: #1668dc;
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.32);
    }

    &.current {
      border-color: #1677ff;
      box-shadow:
        0 0 0 2px rgba(22, 119, 255, 0.18),
        0 8px 24px rgba(0, 0, 0, 0.32);
    }

    &.is-installed {
      background: linear-gradient(180deg, #1f1f1f 0%, #18251e 100%);
    }

    .ant-card-body {
      background: transparent;
    }

    .plugin-card__title {
      color: rgba(255, 255, 255, 0.88);
    }

    a.plugin-card__title:hover {
      color: #69b1ff;
    }

    .plugin-card__author,
    .plugin-card__desc,
    .plugin-card__version,
    .plugin-card__download-count {
      color: rgba(255, 255, 255, 0.48);
    }

    .plugin-card__score {
      color: #ffc53d;
    }

    .plugin-card__meta {
      border-top-color: #303030;
    }

    .plugin-card__tool {
      color: rgba(255, 255, 255, 0.56);

      &:hover {
        color: #69b1ff;
        background: rgba(22, 119, 255, 0.16);
      }
    }

    .plugin-card__version.is-upgradable {
      color: #69b1ff;

      &:hover {
        color: #91caff;
      }
    }
  }
}

.plugin-edit-dialog {
  .ant-modal-body .fs-form-body {
    height: 66vh;
  }
}
</style>
