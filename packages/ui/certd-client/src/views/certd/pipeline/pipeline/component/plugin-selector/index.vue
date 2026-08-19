<template>
  <div class="plugin-selector">
    <a-row :gutter="10" class="mb-10">
      <a-col :span="24" style="padding-left: 20px">
        <a-input-search v-model:value="pluginSearch.keyword" placeholder="搜索插件" :allow-clear="true" :show-search="true"></a-input-search>
      </a-col>
    </a-row>
    <a-tabs v-model:active-key="pluginGroupActive" tab-position="left" class="plugin-selector-tabs">
      <template v-for="group of computedPluginGroups" :key="group.key">
        <a-tab-pane v-if="(group.key === 'admin' && userStore.isAdmin) || group.key !== 'admin'" :key="group.key" class="scroll-y">
          <template #tab>
            <div class="plugin-selector-tab-label">
              <fs-icon :icon="group.icon" class="mr-2" />
              <div>{{ group.title }}</div>
            </div>
          </template>
          <a-row v-if="!group.plugins || group.plugins.length === 0" :gutter="10">
            <a-col class="flex-o">
              <div class="flex-o m-10">没有找到插件</div>
            </a-col>
          </a-row>
          <a-row v-else :gutter="10">
            <a-col v-for="item of group.plugins" :key="item.key" class="plugin-selector-item w-full md:w-[50%]">
              <a-card
                hoverable
                :class="{ current: item.name === modelValue }"
                @click="onSelect(item)"
                @dblclick="
                  onSelect(item);
                  onConfirm(item);
                "
              >
                <a-card-meta>
                  <template #title>
                    <fs-icon class="plugin-icon" :icon="item.icon || 'clarity:plugin-line'"></fs-icon>
                    <span class="title" :title="item.title">{{ item.title }}</span>
                    <vip-button v-if="item.needPlus" mode="icon" />
                  </template>
                  <template #description>
                    <span :title="item.desc" v-html="transformDesc(item.desc)"></span>
                  </template>
                </a-card-meta>
              </a-card>
            </a-col>
          </a-row>
        </a-tab-pane>
      </template>
    </a-tabs>
  </div>
</template>

<script lang="ts" setup>
import { computed, onMounted, ref, Ref, watch } from "vue";
import { notification } from "ant-design-vue";
import { usePluginStore, PluginGroups } from "/@/store/plugin";
import { useSettingStore } from "/@/store/settings";
import { useUserStore } from "/@/store/user";
import { mitter } from "/@/utils/util.mitt";
import { utils } from "/@/utils";

defineOptions({
  name: "PluginSelector",
});

const props = withDefaults(
  defineProps<{
    modelValue?: string;
    // 插件过滤函数（如只显示可作后置任务的插件）
    filterFn?: (plugin: any) => boolean;
  }>(),
  {
    modelValue: "",
    filterFn: () => true,
  }
);

const emit = defineEmits(["update:modelValue", "select", "confirm"]);

const userStore = useUserStore();
const settingStore = useSettingStore();
const pluginStore = usePluginStore();

const pluginSearch = ref({
  keyword: "",
  result: [],
});
const pluginGroupActive = ref("all");
const pluginGroup: Ref = ref();

async function loadPluginGroups() {
  pluginGroup.value = await pluginStore.getGroups();
}

onMounted(() => {
  loadPluginGroups();
});

const computedPluginGroups: any = computed(() => {
  if (!pluginGroup.value) {
    return {};
  }
  const group = pluginGroup.value as PluginGroups;
  const groups = group.groups;
  const filtered: any = {};
  for (const key of Object.keys(groups)) {
    const g = groups[key];
    filtered[key] = {
      ...g,
      plugins: (g.plugins || []).filter((plugin: any) => props.filterFn(plugin)),
    };
  }
  if (pluginSearch.value.keyword) {
    const keyword = pluginSearch.value.keyword.toLowerCase();
    const list = [];
    for (const key of Object.keys(filtered)) {
      for (const plugin of filtered[key].plugins) {
        if (plugin.title?.toLowerCase().includes(keyword) || plugin.desc?.toLowerCase().includes(keyword) || plugin.name?.toLowerCase().includes(keyword)) {
          list.push(plugin);
        }
      }
    }
    return {
      search: { key: "search", title: "搜索结果", plugins: list },
    };
  } else {
    return filtered;
  }
});

watch(
  () => {
    return pluginSearch.value.keyword;
  },
  (val: any) => {
    if (val) {
      pluginGroupActive.value = "search";
    } else {
      pluginGroupActive.value = "all";
    }
  }
);

function checkNeedPlus(item: any): boolean {
  if (item.needPlus && !settingStore.isPlus) {
    notification.warning({ message: "此插件需要开通Certd专业版才能使用" });
    mitter.emit("openVipModal");
    return false;
  }
  return true;
}

// 单击：选中插件（高亮）
function onSelect(item: any) {
  if (!checkNeedPlus(item)) {
    return;
  }
  emit("update:modelValue", item.name);
  emit("select", item);
}

// 双击：选中并确认（与任务步骤插件选择交互一致）
function onConfirm(item: any) {
  emit("confirm", item);
}

function transformDesc(desc: string = "") {
  return utils.transformLink(desc);
}
</script>

<style lang="less">
.plugin-selector {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;

  .plugin-selector-tabs {
    flex: 1;
    min-height: 0;
  }

  .plugin-selector-tab-label {
    // 包括dropdown
    display: flex;
    align-items: center;
    //width: 120px;
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

  .ant-tabs-nav .ant-tabs-tab {
    margin-top: 10px !important;
    padding: 8px 14px !important;
  }

  .plugin-selector-item {
    .ant-card {
      margin-bottom: 10px;
      cursor: pointer;

      &.current {
        border-color: #00b7ff;
      }

      .ant-card-meta-title {
        display: flex;
        flex-direction: row;
        justify-content: flex-start;
      }

      .ant-avatar {
        width: 24px;
        height: 24px;
        flex-shrink: 0;
      }

      .title {
        margin-left: 5px;
        white-space: nowrap;
        flex: 1;
        display: block;
        overflow: hidden;
        text-overflow: ellipsis;
      }
    }

    .ant-card-body {
      padding: 14px;
      height: 100px;

      overflow-y: hidden;

      .ant-card-meta-description {
        font-size: 12px;
        line-height: 20px;
        height: 40px;
        color: #7f7f7f;
      }
    }
  }

  .plugin-icon {
    font-size: 22px;
    color: #00b7ff;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .ant-tabs-content {
    height: 100%;
  }

  .ant-tabs-tabpane {
    padding-right: 10px;
    overflow-y: auto;
    overflow-x: hidden;
  }
}
</style>
