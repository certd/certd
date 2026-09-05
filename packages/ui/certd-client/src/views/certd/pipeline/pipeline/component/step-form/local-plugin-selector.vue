<template>
  <div class="step-plugin-source-pane-local">
    <div class="step-plugin-search">
      <a-input-search v-model:value="localPluginSearch.keyword" placeholder="搜索本地插件" :allow-clear="true" :show-search="true"></a-input-search>
    </div>
    <a-tabs v-model:active-key="pluginGroupActive" tab-position="left" class="step-plugin-selector-tabs flex-1 overflow-hidden h-full">
      <a-tab-pane v-for="group of computedLocalPluginGroups" :key="group.key" class="step-plugin-list-pane">
        <template #tab>
          <div class="cd-step-form-tab-label" @click="handleLocalPluginGroupChange(group.key)">
            <fs-icon :icon="group.icon" class="mr-2" />
            <div>{{ group.title }}</div>
          </div>
        </template>
        <div v-if="!group.plugins || group.plugins.length === 0" class="step-plugin-empty">没有找到插件</div>
        <a-row v-else :gutter="10">
          <a-col v-for="item of group.plugins" :key="item.key || item.name" class="step-plugin w-full md:w-[50%]">
            <a-card hoverable :class="{ current: item.name === selectedType }" @click="emit('select', item)" @dblclick="emit('confirm', item)">
              <a-card-meta>
                <template #title>
                  <fs-icon class="plugin-icon" :icon="item.icon || 'clarity:plugin-line'"></fs-icon>
                  <span class="title" :title="item.title">{{ item.title }}</span>
                  <vip-button v-if="item.needPlus" mode="icon" />
                </template>
                <template #description>
                  <div class="plugin-card-desc" :title="item.desc" v-html="transformDesc(item.desc)"></div>
                </template>
              </a-card-meta>
            </a-card>
          </a-col>
        </a-row>
      </a-tab-pane>
    </a-tabs>
  </div>
</template>

<script lang="ts" setup>
import { computed, ref, Ref, watch } from "vue";
import { PluginGroups, usePluginStore } from "/@/store/plugin";
import { useUserStore } from "/@/store/user";
import { utils } from "/@/utils";

defineProps({
  selectedType: {
    type: String,
    default: "",
  },
});

const emit = defineEmits<{
  (e: "select", plugin: any): void;
  (e: "confirm", plugin: any): void;
}>();

const userStore = useUserStore();
const pluginStore = usePluginStore();
const pluginGroupActive = ref("all");
const pluginGroup: Ref<PluginGroups | undefined> = ref();
const localPluginSearch = ref({
  keyword: "",
});

function transformDesc(desc: string = "") {
  return utils.transformLink(desc);
}

function matchKeyword(plugin: any, keyword: string) {
  const fields = [plugin.title, plugin.desc, plugin.name, plugin.fullName, plugin.author, plugin.latest];
  return fields.some(field =>
    String(field || "")
      .toLowerCase()
      .includes(keyword)
  );
}

async function loadPluginGroups() {
  pluginGroup.value = await pluginStore.getGroups();
}

function handleLocalPluginGroupChange(groupKey: string) {
  pluginGroupActive.value = groupKey;
  localPluginSearch.value.keyword = "";
}

const computedLocalPluginGroups: any = computed(() => {
  if (!pluginGroup.value) {
    return {};
  }
  const groups = pluginGroup.value.groups;
  const keyword = localPluginSearch.value.keyword.trim().toLowerCase();
  const visibleGroups: any = {};
  for (const groupKey of Object.keys(groups)) {
    if (groupKey === "admin" && !userStore.isAdmin) {
      continue;
    }
    visibleGroups[groupKey] = groups[groupKey];
  }
  if (!keyword) {
    return visibleGroups;
  }
  const filteredGroups: any = {};
  for (const groupKey of Object.keys(visibleGroups)) {
    const currentGroup = visibleGroups[groupKey];
    filteredGroups[groupKey] = {
      ...currentGroup,
      plugins: currentGroup.plugins.filter((plugin: any) => {
        return matchKeyword(plugin, keyword);
      }),
    };
  }
  return filteredGroups;
});

watch(
  () => {
    return localPluginSearch.value.keyword;
  },
  val => {
    if (val) {
      pluginGroupActive.value = "all";
    }
  }
);

loadPluginGroups();
</script>

<style lang="less">
.step-plugin-source-pane-local {
  .cd-step-form-tab-label {
    display: flex;
    align-items: center;

    .fs-icon {
      display: flex;
      align-items: center;
      color: #00b7ff;

      svg {
        vertical-align: middle !important;
        display: flex;
        align-items: center;
      }
    }
  }

  .step-plugin-source-pane {
    display: flex;
    height: 100%;
    min-height: 0;
    flex-direction: column;
  }

  .step-plugin-search {
    flex: none;
    padding: 0 0 12px;
  }

  .step-plugin-empty {
    display: flex;
    min-height: 320px;
    align-items: center;
    justify-content: center;
    color: #7b8794;
    font-size: 13px;
  }

  .plugin-card-desc {
    overflow: hidden;
    display: -webkit-box;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 2;
  }

  .step-plugin {
    display: flex;

    .ant-card {
      width: 100%;
      margin-bottom: 10px;
      cursor: pointer;

      &.current {
        border-color: #00b7ff;
      }

      .ant-card-meta-title {
        display: flex;
        min-height: 22px;
        flex-direction: row;
        align-items: center;
        justify-content: flex-start;
      }

      .ant-avatar {
        width: 24px;
        height: 24px;
        flex-shrink: 0;
      }

      .title {
        display: block;
        min-width: 0;
        flex: 1;
        margin-left: 5px;
        overflow: hidden;
        line-height: 22px;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
    }

    .ant-card-body {
      min-height: 100px;
      padding: 14px 14px 6px;
      overflow-y: hidden;

      .ant-card-meta-description {
        min-height: 40px;
        color: #7f7f7f;
        font-size: 12px;
        line-height: 20px;
      }

      .plugin-icon {
        color: #00b7ff;
        font-size: 18px;
      }
    }
  }
}
</style>
