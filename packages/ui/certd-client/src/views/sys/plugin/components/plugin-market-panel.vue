<template>
  <div class="plugin-market-panel">
    <div class="plugin-market-search">
      <a-select v-model:value="onlineSearch.pluginType" class="plugin-market-search__type" allow-clear :disabled="!marketReady" :placeholder="t('certd.pluginType')" @change="handleOnlineSearch">
        <a-select-option value="deploy">{{ t("certd.deployPlugin") }}</a-select-option>
        <a-select-option value="access">{{ t("certd.auth") }}</a-select-option>
        <a-select-option value="dnsProvider">{{ t("certd.dns") }}</a-select-option>
      </a-select>
      <a-input-search
        v-model:value="onlineSearch.keyword"
        class="plugin-market-search__keyword"
        :placeholder="t('certd.onlinePluginSearch')"
        allow-clear
        :disabled="!marketReady"
        :loading="onlineLoading"
        @search="handleOnlineSearch"
      />
      <a-tooltip :title="syncButtonTitle">
        <a-button type="primary" :loading="syncLoading" @click="syncOnlinePlugins">
          <template #icon>
            <fs-icon icon="ion:sync-outline" />
          </template>
          {{ t("certd.onlinePluginSync") }}
        </a-button>
      </a-tooltip>
    </div>

    <div v-if="onlineLoading" class="plugin-market-state">正在查询插件市场...</div>
    <div v-else-if="!marketReady" class="plugin-market-state plugin-market-sync-state">
      <fs-icon icon="ion:cloud-download-outline" />
      <div>{{ t("certd.onlinePluginSyncFirst") }}</div>
      <a-tooltip :title="syncButtonTitle">
        <a-button type="primary" :loading="syncLoading" @click="syncOnlinePlugins">
          {{ t("certd.onlinePluginSync") }}
        </a-button>
      </a-tooltip>
    </div>
    <a-empty v-else-if="pagedOnlinePlugins.length === 0" class="plugin-card-empty" />
    <template v-else>
      <div class="plugin-card-grid">
        <PluginItemCard
          v-for="item of pagedOnlinePlugins"
          :key="getOnlinePluginFullName(item) || item.id || item.name"
          :plugin="item"
          :install-loading="isOnlineActionLoading(item, 'install')"
          :uninstall-loading="isOnlineActionLoading(item, 'uninstall')"
          :toggle-loading="isOnlineActionLoading(item, 'toggle')"
          @install="installOnlinePlugin"
          @uninstall="uninstallOnlinePlugin"
          @toggle-disabled="toggleOnlinePluginDisabled"
        />
      </div>
      <div class="plugin-market-pagination">
        <a-pagination v-model:current="onlinePage" size="small" :page-size="onlinePageSize" :total="onlinePlugins.length" :show-size-changer="false" />
      </div>
    </template>
  </div>
</template>

<script lang="ts" setup>
import { message, Modal } from "ant-design-vue";
import { computed, onMounted, ref } from "vue";
import * as api from "../api";
import PluginItemCard from "./plugin-item-card.vue";
import { usePluginStore } from "/@/store/plugin";
import { useI18n } from "/src/locales";

const emit = defineEmits<{
  (e: "changed"): void;
}>();

const { t } = useI18n();
const pluginStore = usePluginStore();
const onlinePlugins = ref<api.OnlinePluginBean[]>([]);
const onlineLoading = ref(true);
const syncLoading = ref(false);
const onlineActionLoading = ref("");
const onlineLoaded = ref(false);
const hasSynced = ref(false);
const onlinePage = ref(1);
const onlinePageSize = 12;
const onlineSearch = ref({
  pluginType: undefined as string | undefined,
  keyword: "",
});
const onlineQuery = ref({
  pluginType: undefined as string | undefined,
  keyword: "",
});
let onlineRequestId = 0;
const ONLINE_PLUGIN_LAST_SYNC_TIME_KEY = "certd:plugin-market:last-sync-time";
const lastSyncTime = ref(readLastSyncTime());

const pagedOnlinePlugins = computed(() => {
  const start = (onlinePage.value - 1) * onlinePageSize;
  return onlinePlugins.value.slice(start, start + onlinePageSize);
});

const marketReady = computed(() => {
  return hasSynced.value || onlinePlugins.value.length > 0;
});

const syncButtonTitle = computed(() => {
  if (!lastSyncTime.value) {
    return t("certd.onlinePluginNotSynced");
  }
  return t("certd.onlinePluginLastSyncTime", {
    time: formatSyncTime(lastSyncTime.value),
  });
});

function readLastSyncTime() {
  const value = Number(localStorage.getItem(ONLINE_PLUGIN_LAST_SYNC_TIME_KEY) || 0);
  if (!Number.isFinite(value)) {
    return 0;
  }
  return value;
}

function saveLastSyncTime(time: number) {
  lastSyncTime.value = time;
  localStorage.setItem(ONLINE_PLUGIN_LAST_SYNC_TIME_KEY, `${time}`);
}

function formatSyncTime(time: number) {
  return new Date(time).toLocaleString();
}

function getOnlinePluginFullName(row: api.OnlinePluginBean) {
  if (row.fullName) {
    return row.fullName;
  }
  if (row.author && row.name) {
    return `${row.author}/${row.name}`;
  }
  return row.name || "";
}

function getOnlinePluginActionKey(row: api.OnlinePluginBean, action: "install" | "uninstall" | "toggle") {
  const fullName = getOnlinePluginFullName(row);
  if (!fullName) {
    return "";
  }
  return `${action}:${fullName}`;
}

function isOnlineActionLoading(row: api.OnlinePluginBean, action: "install" | "uninstall" | "toggle") {
  return onlineActionLoading.value === getOnlinePluginActionKey(row, action);
}

async function loadOnlinePlugins(options?: { force?: boolean; silent?: boolean }) {
  if (onlineLoaded.value && !options?.force && !onlineQuery.value.keyword && !onlineQuery.value.pluginType) {
    return;
  }
  const requestId = ++onlineRequestId;
  if (!options?.silent) {
    onlineLoading.value = true;
  }
  try {
    const list = await api.OnlinePluginList({
      pluginType: onlineQuery.value.pluginType,
      keyword: onlineQuery.value.keyword.trim() || undefined,
    });
    if (requestId !== onlineRequestId) {
      return;
    }
    onlinePlugins.value = list;
    if (list.length > 0) {
      hasSynced.value = true;
    }
    onlineLoaded.value = true;
  } finally {
    if (requestId === onlineRequestId && !options?.silent) {
      onlineLoading.value = false;
    }
  }
}

async function syncOnlinePlugins() {
  syncLoading.value = true;
  try {
    onlineSearch.value.pluginType = undefined;
    onlineSearch.value.keyword = "";
    onlineQuery.value.pluginType = undefined;
    onlineQuery.value.keyword = "";
    onlinePage.value = 1;
    onlinePlugins.value = await api.OnlinePluginSync();
    saveLastSyncTime(Date.now());
    onlineLoaded.value = true;
    hasSynced.value = true;
    message.success(t("certd.onlinePluginSyncSuccess"));
  } finally {
    syncLoading.value = false;
  }
}

function handleOnlineSearch() {
  onlineQuery.value = {
    pluginType: onlineSearch.value.pluginType,
    keyword: onlineSearch.value.keyword.trim(),
  };
  onlinePage.value = 1;
  loadOnlinePlugins({ force: true });
}

async function installOnlinePlugin(row: api.OnlinePluginBean) {
  const fullName = getOnlinePluginFullName(row);
  if (!fullName) {
    return;
  }
  onlineActionLoading.value = getOnlinePluginActionKey(row, "install");
  try {
    await api.OnlinePluginInstall({
      fullName,
      version: row.latest,
    });
    await pluginStore.reload();
    emit("changed");
    await loadOnlinePlugins({ force: true, silent: true });
    message.success(t("certd.onlinePluginInstallSuccess"));
  } finally {
    onlineActionLoading.value = "";
  }
}

function toggleOnlinePluginDisabled(row: api.OnlinePluginBean) {
  const fullName = getOnlinePluginFullName(row);
  if (!row.localPluginId || !fullName) {
    return;
  }
  Modal.confirm({
    title: t("certd.confirm"),
    content: `${t("certd.confirmToggle")} ${!row.localDisabled ? t("certd.disable") : t("certd.enable")}?`,
    async onOk() {
      onlineActionLoading.value = getOnlinePluginActionKey(row, "toggle");
      try {
        await api.SetDisabled({
          id: row.localPluginId,
          name: row.name,
          type: "store",
          disabled: !row.localDisabled,
        });
        await pluginStore.reload();
        emit("changed");
        await loadOnlinePlugins({ force: true, silent: true });
        message.success(t("certd.operationSuccess"));
      } finally {
        onlineActionLoading.value = "";
      }
    },
  });
}

function uninstallOnlinePlugin(row: api.OnlinePluginBean) {
  const fullName = getOnlinePluginFullName(row);
  if (!row.localPluginId || !fullName) {
    return;
  }
  Modal.confirm({
    title: t("certd.confirm"),
    content: t("certd.onlinePluginDeleteConfirm", { name: fullName }),
    async onOk() {
      onlineActionLoading.value = getOnlinePluginActionKey(row, "uninstall");
      try {
        await api.DelObj(row.localPluginId);
        await pluginStore.reload();
        emit("changed");
        await loadOnlinePlugins({ force: true, silent: true });
        message.success(t("certd.onlinePluginUninstallSuccess"));
      } finally {
        onlineActionLoading.value = "";
      }
    },
  });
}

onMounted(() => {
  loadOnlinePlugins();
});
</script>

<style lang="less">
.plugin-market-panel {
  display: flex;
  min-height: 0;
  flex: 1;
  flex-direction: column;
  overflow: hidden;
}

.plugin-market-search {
  display: flex;
  flex: none;
  align-items: center;
  gap: 8px;
  padding: 2px 10px 12px;
}

.plugin-market-search__type {
  width: 148px;
  flex: none;
}

.plugin-market-search__keyword {
  max-width: 360px;
}

.plugin-market-state {
  display: flex;
  min-height: 260px;
  flex: 1;
  align-items: center;
  justify-content: center;
  color: #7b8794;
  font-size: 13px;
}

.plugin-market-sync-state {
  flex-direction: column;
  gap: 12px;

  > .fs-icon {
    color: #1677ff;
    font-size: 32px;
  }
}

.plugin-market-pagination {
  display: flex;
  flex: none;
  justify-content: flex-end;
  padding: 0 10px 12px;
}
</style>
