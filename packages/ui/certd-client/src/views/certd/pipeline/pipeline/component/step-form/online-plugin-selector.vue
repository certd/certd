<template>
  <div class="step-plugin-source-pane-online">
    <div class="step-plugin-search">
      <a-input-search v-model:value="onlinePluginSearch.keyword" placeholder="搜索插件市场" :allow-clear="true" :show-search="true" :loading="onlineLoading" @search="handleOnlinePluginSearch"></a-input-search>
    </div>
    <a-tabs v-model:active-key="onlinePluginGroupActive" tab-position="left" class="step-plugin-selector-tabs step-market-tabs flex-1 overflow-hidden h-full">
      <a-tab-pane v-for="group of computedOnlinePluginGroups" :key="group.key" class="step-plugin-list-pane">
        <template #tab>
          <div class="cd-step-form-tab-label" @click="handleOnlinePluginGroupChange(group.key)">
            <fs-icon :icon="group.icon" class="mr-2" />
            <div>{{ group.title }}</div>
          </div>
        </template>
        <div v-if="onlineLoading" class="step-market-state">正在加载插件市场...</div>
        <div v-else-if="!group.plugins || group.plugins.length === 0" class="step-plugin-empty">没有找到插件</div>
        <template v-else>
          <div class="step-market-content">
            <a-row :gutter="[12, 12]">
              <a-col v-for="item of group.plugins" :key="item.key || item.fullName" class="step-plugin market-plugin-col w-full md:w-[50%]">
                <PluginItemCard :plugin="item" simple :current="isOnlinePluginCurrent(item)" @click="onlinePluginSelected(item)" @dblclick="handleOnlinePluginCardDblclick(item)" @changed="handleOnlinePluginChanged" />
              </a-col>
            </a-row>
            <div class="online-plugin-pagination">
              <a-pagination v-model:current="onlinePage" size="small" :page-size="onlinePageSize" :total="onlineCurrentTotal" :show-size-changer="false" simple />
            </div>
          </div>
        </template>
      </a-tab-pane>
    </a-tabs>
  </div>
</template>

<script lang="ts" setup>
import { computed, ref, Ref, watch } from "vue";
import { PluginGroups, usePluginStore } from "/@/store/plugin";
import { useUserStore } from "/@/store/user";
import PluginItemCard from "/@/views/sys/plugin/components/plugin-item-card.vue";
import * as pluginApi from "/@/views/sys/plugin/api";
import { useI18n } from "/src/locales";

const props = defineProps({
  selectedType: {
    type: String,
    default: "",
  },
});

const emit = defineEmits<{
  (e: "select", plugin: any): void;
  (e: "confirm", plugin: any): void;
  (e: "uninstalled", plugin: any): void;
}>();

const { t } = useI18n();
const userStore = useUserStore();
const pluginStore = usePluginStore();
const pluginGroup: Ref<PluginGroups | undefined> = ref();
const onlinePlugins: Ref<pluginApi.OnlinePluginBean[]> = ref([]);
const onlineGroupPlugins: Ref<pluginApi.OnlinePluginBean[]> = ref([]);
const onlineLoading: Ref<boolean> = ref(false);
const onlineGroupLoaded: Ref<boolean> = ref(false);
const onlinePluginSearch = ref({
  keyword: "",
});
const onlinePluginQueryKeyword = ref("");
const onlinePluginGroupActive = ref("all");
const onlinePage = ref(1);
const onlinePageSize = 8;
let onlineRequestId = 0;

async function loadPluginGroups() {
  pluginGroup.value = await pluginStore.getGroups();
}

function getOnlinePluginListReq(req?: { groupKey?: string; keyword?: string }) {
  const groupKey = req?.groupKey ?? onlinePluginGroupActive.value;
  const keyword = (req?.keyword ?? onlinePluginQueryKeyword.value).trim();
  const query: { pluginType: string; group?: string; keyword?: string } = {
    pluginType: "deploy",
  };
  if (groupKey && groupKey !== "all") {
    query.group = groupKey;
  }
  if (keyword) {
    query.keyword = keyword;
  }
  return query;
}

async function loadOnlinePluginGroups(force = false) {
  if (!userStore.isAdmin) {
    return [];
  }
  if (onlineGroupLoaded.value && !force) {
    return onlineGroupPlugins.value;
  }
  const list = await pluginApi.OnlinePluginList({ pluginType: "deploy" });
  onlineGroupPlugins.value = list;
  onlineGroupLoaded.value = true;
  return list;
}

async function loadOnlinePlugins(force = false, options?: { silent?: boolean }) {
  if (!userStore.isAdmin) {
    return;
  }
  const requestId = ++onlineRequestId;
  if (!options?.silent) {
    onlineLoading.value = true;
  }
  try {
    const groupPlugins = await loadOnlinePluginGroups(force);
    if (requestId !== onlineRequestId) {
      return;
    }
    const query = getOnlinePluginListReq();
    const isFullQuery = !query.group && !query.keyword;
    if (isFullQuery) {
      onlinePlugins.value = groupPlugins;
    } else {
      const list = await pluginApi.OnlinePluginList(query);
      if (requestId !== onlineRequestId) {
        return;
      }
      onlinePlugins.value = list;
    }
  } finally {
    if (!options?.silent && requestId === onlineRequestId) {
      onlineLoading.value = false;
    }
  }
}

function getOnlinePluginDisplayName(plugin: pluginApi.OnlinePluginBean) {
  if (plugin.fullName) {
    return plugin.fullName;
  }
  if (plugin.author && plugin.name) {
    return `${plugin.author}/${plugin.name}`;
  }
  return plugin.name || "";
}

function buildOnlinePluginCard(plugin: pluginApi.OnlinePluginBean) {
  const fullName = getOnlinePluginDisplayName(plugin);
  return {
    ...plugin,
    key: `online:${fullName}`,
    name: fullName,
    fullName,
    title: plugin.title || plugin.name || fullName,
    desc: plugin.desc,
    icon: plugin.icon || "clarity:plugin-line",
    __online: true,
  };
}

function getOnlinePluginGroupKey(plugin: pluginApi.OnlinePluginBean) {
  return (plugin.group || "other").trim() || "other";
}

function getOnlinePluginGroupMeta(groupKey: string) {
  const localGroups = pluginGroup.value?.groups || {};
  const localGroup = localGroups[groupKey];
  if (localGroup) {
    return {
      title: localGroup.title,
      icon: localGroup.icon,
      order: localGroup.order,
    };
  }
  if (groupKey === "other") {
    return {
      title: "其他",
      icon: "clarity:plugin-line",
      order: 9999,
    };
  }
  return {
    title: groupKey,
    icon: "clarity:plugin-line",
    order: 1000,
  };
}

function getFilteredOnlinePlugins() {
  return onlinePlugins.value.map(plugin => buildOnlinePluginCard(plugin));
}

function getOnlinePluginsByGroup(groupKey: string) {
  const list = getFilteredOnlinePlugins();
  if (groupKey === "all") {
    return list;
  }
  return list.filter(plugin => getOnlinePluginGroupKey(plugin) === groupKey);
}

function getPagedOnlinePlugins(groupKey: string) {
  const list = getOnlinePluginsByGroup(groupKey);
  const start = (onlinePage.value - 1) * onlinePageSize;
  return list.slice(start, start + onlinePageSize);
}

async function handleOnlinePluginChanged(payload: { plugin: any; action: string }) {
  if (payload.action === "uninstall" && props.selectedType === payload.plugin.fullName) {
    emit("uninstalled", payload.plugin);
  }
  if (payload.action === "install" || payload.action === "uninstall") {
    await pluginStore.reload();
  }
  await loadPluginGroups();
  await loadOnlinePlugins(true, { silent: true });
}

function getInstalledPlugin(plugin: any) {
  if (!plugin.installed || !plugin.fullName) {
    return null;
  }
  const groups = pluginGroup.value;
  if (!groups) {
    return null;
  }
  const candidateNames = [plugin.fullName, plugin.name, plugin.author && plugin.name ? `${plugin.author}/${plugin.name}` : ""].filter(Boolean);
  for (const name of candidateNames) {
    const installedPlugin = groups.get(name);
    if (installedPlugin) {
      return installedPlugin;
    }
  }
  return groups.groups.all.plugins.find((item: any) => {
    if (plugin.id && item.id === plugin.id) {
      return true;
    }
    return item.author === plugin.author && item.name === plugin.name;
  });
}

function isOnlinePluginCurrent(plugin: any) {
  const installedPlugin = getInstalledPlugin(plugin);
  return !!installedPlugin && installedPlugin.name === props.selectedType;
}

function onlinePluginSelected(plugin: any) {
  const installedPlugin = getInstalledPlugin(plugin);
  if (!installedPlugin) {
    return;
  }
  emit("select", installedPlugin);
}

function handleOnlinePluginCardDblclick(plugin: any) {
  const installedPlugin = getInstalledPlugin(plugin);
  if (!installedPlugin) {
    return;
  }
  emit("confirm", installedPlugin);
}

function handleOnlinePluginGroupChange(groupKey: string) {
  onlinePluginGroupActive.value = groupKey;
  onlinePluginSearch.value.keyword = "";
  onlinePluginQueryKeyword.value = "";
  onlinePage.value = 1;
  loadOnlinePlugins();
}

function handleOnlinePluginSearch(value: string) {
  onlinePluginQueryKeyword.value = (value || "").trim();
  onlinePluginGroupActive.value = "all";
  onlinePage.value = 1;
  loadOnlinePlugins();
}

const computedOnlinePluginGroups: any = computed(() => {
  const allPlugins = onlineGroupPlugins.value.map(plugin => buildOnlinePluginCard(plugin));
  const groups: any = {
    all: {
      key: "all",
      title: t("certd.all"),
      order: 0,
      icon: "material-symbols:border-all-rounded",
      plugins: getPagedOnlinePlugins("all"),
    },
  };
  const groupKeys = Array.from(new Set(allPlugins.map(plugin => getOnlinePluginGroupKey(plugin))));
  groupKeys.sort((left, right) => {
    const leftMeta = getOnlinePluginGroupMeta(left);
    const rightMeta = getOnlinePluginGroupMeta(right);
    return leftMeta.order - rightMeta.order || left.localeCompare(right);
  });
  for (const groupKey of groupKeys) {
    const meta = getOnlinePluginGroupMeta(groupKey);
    groups[groupKey] = {
      key: groupKey,
      title: meta.title,
      order: meta.order,
      icon: meta.icon,
      plugins: getPagedOnlinePlugins(groupKey),
    };
  }
  return groups;
});

const onlineTotalPage = computed(() => {
  const total = getOnlinePluginsByGroup(onlinePluginGroupActive.value).length;
  return Math.max(1, Math.ceil(total / onlinePageSize));
});

const onlineCurrentTotal = computed(() => {
  return getOnlinePluginsByGroup(onlinePluginGroupActive.value).length;
});

watch(
  () => {
    return onlinePluginGroupActive.value;
  },
  () => {
    onlinePage.value = 1;
  }
);

watch(
  () => {
    return onlineTotalPage.value;
  },
  totalPage => {
    if (onlinePage.value > totalPage) {
      onlinePage.value = totalPage;
    }
  }
);

loadPluginGroups();
loadOnlinePlugins();
</script>

<style lang="less">
.step-plugin-source-pane-online {
  .step-market-content {
    min-height: 100%;
    padding: 2px 2px 12px 0;
  }

  .step-market-state {
    display: flex;
    min-height: 320px;
    align-items: center;
    justify-content: center;
    color: #7b8794;
    font-size: 13px;
  }

  .market-plugin-col {
    display: flex;
  }

  .online-plugin-pagination {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    min-height: 42px;
    padding: 10px 2px 0;
    color: #5f6b7a;
    font-size: 12px;
    font-variant-numeric: tabular-nums;

    .ant-pagination {
      margin: 0;
    }

    .ant-pagination-simple-pager {
      font-variant-numeric: tabular-nums;
    }
  }
}
</style>
