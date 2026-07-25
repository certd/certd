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
    @click="emit('click', plugin)"
    @dblclick="emit('dblclick', plugin)"
  >
    <div class="plugin-card__head">
      <div class="plugin-card__main">
        <fs-icon class="plugin-icon plugin-card__icon" :icon="plugin.icon || 'clarity:plugin-line'" />
        <div class="plugin-card__title-wrap">
          <router-link v-if="source === 'local' && plugin.type === 'custom'" class="plugin-card__title" :title="plugin.title || plugin.name" :to="`/sys/plugin/edit?id=${plugin.id}`" @click.stop>
            {{ plugin.title || plugin.name }}
          </router-link>
          <span v-else class="plugin-card__title" :title="plugin.title || plugin.name">{{ plugin.title || plugin.name }}</span>
        </div>
      </div>
      <div class="plugin-card__actions">
        <template v-if="source === 'local'">
          <div class="plugin-card__tools">
            <a-tooltip v-if="plugin.type === 'custom'" title="编辑">
              <a-button class="plugin-card__tool" type="text" size="small" @click.stop="emit('edit', plugin)">
                <template #icon>
                  <fs-icon icon="ion:create-outline" />
                </template>
              </a-button>
            </a-tooltip>
            <a-tooltip v-if="plugin.type === 'custom'" title="复制">
              <a-button class="plugin-card__tool" type="text" size="small" @click.stop="emit('copy', plugin)">
                <template #icon>
                  <fs-icon icon="ion:copy-outline" />
                </template>
              </a-button>
            </a-tooltip>
            <a-tooltip v-if="plugin.type === 'custom'" :title="t('certd.export')">
              <a-button class="plugin-card__tool" type="text" size="small" @click.stop="emit('export-plugin', plugin)">
                <template #icon>
                  <fs-icon icon="ion:cloud-download-outline" />
                </template>
              </a-button>
            </a-tooltip>
            <a-tooltip v-if="showConfig" title="配置">
              <a-button class="plugin-card__tool" type="text" size="small" @click.stop="emit('config', plugin)">
                <template #icon>
                  <fs-icon icon="ion:settings-outline" />
                </template>
              </a-button>
            </a-tooltip>
          </div>
          <div v-if="canRemoveLocal" class="plugin-card__action-zone plugin-card__local-action-zone">
            <a-tag color="green" class="plugin-status-tag">{{ t("certd.onlinePluginInstalled") }}</a-tag>
            <a-button class="plugin-card__action-button" size="small" danger ghost @click.stop="emit('remove', plugin)">
              {{ t("certd.onlinePluginUninstall") }}
            </a-button>
          </div>
        </template>
        <template v-else-if="plugin.installed">
          <div v-if="plugin.localPluginId" class="plugin-card__action-zone" :class="{ 'is-loading': uninstallLoading }">
            <a-tag color="green" class="plugin-status-tag">{{ t("certd.onlinePluginInstalled") }}</a-tag>
            <a-button class="plugin-card__action-button" size="small" danger ghost :loading="uninstallLoading" @click.stop="emit('uninstall', plugin)">
              {{ t("certd.onlinePluginUninstall") }}
            </a-button>
          </div>
          <a-tag v-else color="green" class="plugin-status-tag">{{ t("certd.onlinePluginInstalled") }}</a-tag>
        </template>
        <div v-else class="plugin-card__action-zone plugin-card__install-zone" :class="{ 'is-loading': installLoading }">
          <a-button class="plugin-card__action-button" size="small" type="primary" :loading="installLoading" @click.stop="emit('install', plugin)">
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
          <a-tag class="plugin-status-tag" :color="plugin.disabled ? 'default' : 'green'" @click.stop="emit('toggle-disabled', plugin)">
            {{ plugin.disabled ? t("certd.onlinePluginDisabled") : t("certd.onlinePluginEnabled") }}
          </a-tag>
        </a-tooltip>
        <a-tag>{{ pluginTypeLabel }}</a-tag>
        <a-tag>{{ sourceLabel }}</a-tag>
        <a-tag v-if="plugin.group">{{ plugin.group }}</a-tag>
      </template>
      <template v-else-if="!simple">
        <a-tooltip v-if="plugin.installed && plugin.localPluginId" :title="toggleTitle">
          <a-tag class="plugin-status-tag" :class="{ 'is-loading': toggleLoading }" :color="plugin.localDisabled ? 'default' : 'green'" @click.stop="emit('toggle-disabled', plugin)">
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
      </template>
      <a-tooltip :title="versionTitle">
        <span class="plugin-card__version" :class="{ 'is-upgradable': plugin.upgradeAvailable }" @click.stop="handleVersionClick">
          v{{ currentVersion }}
          <fs-icon v-if="plugin.upgradeAvailable" class="plugin-card__version-icon" icon="carbon:upgrade" />
        </span>
      </a-tooltip>
      <span v-if="source !== 'local' && authorName" class="plugin-card__author" :title="`${t('certd.author')}：${authorName}`">
        <fs-icon icon="ion:person-circle-outline" />
        <span>{{ authorName }}</span>
      </span>
    </div>
  </a-card>
</template>

<script lang="ts" setup>
import { computed } from "vue";
import { useI18n } from "/src/locales";

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
    installLoading?: boolean;
    uninstallLoading?: boolean;
    toggleLoading?: boolean;
  }>(),
  {
    source: "market",
  }
);

const emit = defineEmits<{
  (e: "click", plugin: any): void;
  (e: "dblclick", plugin: any): void;
  (e: "edit", plugin: any): void;
  (e: "copy", plugin: any): void;
  (e: "export-plugin", plugin: any): void;
  (e: "config", plugin: any): void;
  (e: "remove", plugin: any): void;
  (e: "install", plugin: any): void;
  (e: "uninstall", plugin: any): void;
  (e: "toggle-disabled", plugin: any): void;
}>();

const { t } = useI18n();

const isInstalled = computed(() => {
  return props.source !== "local" && props.plugin.installed;
});

const isDisabled = computed(() => {
  return props.source === "local" ? props.plugin.disabled : props.plugin.localDisabled;
});

const canRemoveLocal = computed(() => {
  return props.plugin.type === "custom" || props.plugin.type === "store";
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

function formatDownloadCount(count: number) {
  if (count >= 10000) {
    return `${(count / 10000).toFixed(1).replace(/\.0$/, "")}w`;
  }
  return `${count}`;
}

function handleVersionClick() {
  if (props.source === "local" || !props.plugin.upgradeAvailable) {
    return;
  }
  emit("install", props.plugin);
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
    padding: 14px 16px 12px;
  }

  .plugin-card__head {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 12px;
  }

  .plugin-card__main {
    display: flex;
    min-width: 0;
    flex: 1;
    align-items: flex-start;
  }

  .plugin-card__icon {
    flex: none;
    margin-top: 1px;
  }

  .plugin-card__main .plugin-icon {
    display: flex;
    align-items: flex-end;
    justify-content: center;
    width: 22px;
    height: 22px;
    flex-shrink: 0;
    color: #00b7ff;
    font-size: 22px;
    line-height: 22px;
  }

  .plugin-card__title-wrap {
    min-width: 0;
    flex: 1;
    margin-left: 8px;
  }

  .plugin-card__title {
    display: block;
    min-width: 0;
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
    min-width: max-content;
    flex: none;
    align-items: center;
    gap: 1px;
    opacity: 0.76;
    transition-duration: 160ms;
    transition-property: opacity;
    transition-timing-function: ease-out;
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
      font-size: 15px;
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
    width: 76px;
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

  &:hover {
    .plugin-card__tools {
      opacity: 1;
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

  &.is-simple {
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
</style>
