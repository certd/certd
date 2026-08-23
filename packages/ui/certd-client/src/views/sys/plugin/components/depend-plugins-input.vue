<template>
  <div class="depend-plugins-input">
    <a-cascader v-if="single" :value="singleValue" :options="cascaderOptions" :loading="loadingOptions" placeholder="选择插件" class="depend-plugins-input__select" @change="onSingleChange" />
    <div v-for="(item, index) of displayItems" :key="index" class="depend-plugins-input__row">
      <a-cascader :value="item.cascaderValue" :options="cascaderOptions" placeholder="选择依赖插件" class="depend-plugins-input__select" @change="onPluginChange(index, $event)" />
      <a-button type="link" danger @click="removeItem(index)">
        <template #icon>
          <DeleteOutlined />
        </template>
      </a-button>
    </div>
    <a-button v-if="!single" type="dashed" block @click="addItem">
      <template #icon>
        <PlusOutlined />
      </template>
      添加依赖
    </a-button>
  </div>
</template>

<script lang="ts" setup>
import { computed, nextTick, onMounted, ref, watch } from "vue";
import { DeleteOutlined, PlusOutlined } from "@ant-design/icons-vue";
import * as api from "../api";
import { usePluginStore } from "/@/store/plugin";
import { useSettingStore } from "/src/store/settings";
import { useI18n } from "/src/locales";

const props = defineProps<{
  modelValue: Record<string, string> | string[];
  single?: boolean;
  editableOnly?: boolean;
}>();

const emit = defineEmits<{
  (e: "update:modelValue", value: Record<string, string>): void;
  (e: "update:modelValue", value: string[]): void;
}>();

interface DepItem {
  /** 依赖 key 的「类型:引用」部分，如 access:tencent/TestAccess 或 access:aliyun */
  optionValue: string;
}

interface PluginEntry {
  value: string;
  label: string;
  /** 类型前缀（plugin 表示 deploy） */
  pluginType: string;
  group: string;
  children?: any[];
}

interface CascaderOption {
  value: string;
  label: string;
  children?: any[];
}

const { t } = useI18n();
const pluginStore = usePluginStore();
const settingStore = useSettingStore();
const items = ref<DepItem[]>([]);
const pluginEntries = ref<PluginEntry[]>([]);
const loadingOptions = ref(false);

const DEFAULT_GROUP = "默认";

const TYPE_LABELS: Record<string, string> = {
  access: t("certd.auth"),
  plugin: t("certd.deployPlugin"),
  dnsProvider: t("certd.dns"),
  notification: "通知",
  addon: "Addon",
};

const TYPE_ORDER = ["access", "plugin", "dnsProvider", "notification", "addon"];

const cascaderOptions = computed<CascaderOption[]>(() => buildCascaderOptions(pluginEntries.value));
const singleValue = computed(() => {
  const value = Array.isArray(props.modelValue) ? props.modelValue : [];
  return value.length === 1 ? toCascaderValue(value[0]) : value;
});

/**
 * 渲染用：根据 optionValue 实时反查级联选中路径。
 * 插件选项异步加载完成后 cascaderOptions 更新，这里自动跟随，实现编辑回显。
 */
const displayItems = computed(() => {
  return items.value.map(item => ({
    optionValue: item.optionValue,
    cascaderValue: toCascaderValue(item.optionValue),
  }));
});

// emitting 必须在 watch（immediate）之前声明，避免 TDZ 报错
const emitting = ref(false);

watch(
  () => props.modelValue,
  val => {
    if (emitting.value) {
      // 自身 emit 引起的 modelValue 回写，跳过重建，避免输入框被重置
      return;
    }
    syncItemsFromModel(val as Record<string, string>);
  },
  { deep: true, immediate: true }
);

onMounted(() => {
  void loadPluginOptions();
});

function syncItemsFromModel(model: Record<string, string>) {
  if (props.single) return;
  items.value = Object.keys(model || {}).map(key => ({
    optionValue: key,
  }));
}

function onSingleChange(path: string[]) {
  emit("update:modelValue", path || []);
}

async function loadPluginOptions() {
  if (loadingOptions.value || pluginEntries.value.length > 0) {
    return;
  }
  loadingOptions.value = true;
  try {
    await pluginStore.init();
    const entries: PluginEntry[] = [];
    const seen = new Set<string>();

    // 已同步的市场插件（含已安装的）
    const marketList = (await api.OnlinePluginList({})) || [];
    for (const plugin of marketList) {
      if (props.editableOnly && !canEditPlugin(plugin)) continue;
      const ref = pluginFullName(plugin);
      const typePrefix = pluginTypePrefix(plugin.pluginType, plugin.addonType);
      if (!ref || !typePrefix) {
        continue;
      }
      const value = `${typePrefix}:${ref}`;
      if (seen.has(value)) {
        continue;
      }
      seen.add(value);
      entries.push({
        value,
        label: `${plugin.title || plugin.name} (${ref})`,
        pluginType: typePrefix,
        group: plugin.group || "",
      });
    }

    // 内置插件
    const groups = pluginStore.group?.groups || {};
    for (const groupKey in groups) {
      const group = groups[groupKey];
      for (const plugin of group.plugins || []) {
        if (plugin.type === "store") {
          continue; // 已从市场列表加入
        }
        if (props.editableOnly && !canEditPlugin(plugin)) {
          continue;
        }
        const ref = `${plugin.name || ""}`.trim();
        const typePrefix = pluginTypePrefix(plugin.pluginType, plugin.addonType);
        if (!ref || !typePrefix) {
          continue;
        }
        const value = `${typePrefix}:${ref}`;
        if (seen.has(value)) {
          continue;
        }
        seen.add(value);
        entries.push({
          value,
          label: `${plugin.title || plugin.name} (${ref})`,
          pluginType: typePrefix,
          group: plugin.group || "",
        });
      }
    }

    pluginEntries.value = entries;
  } finally {
    loadingOptions.value = false;
  }
}

function canEditPlugin(plugin: any) {
  const developerId = Number(plugin.developerId || 0);
  const bindUserId = Number(settingStore.installInfo?.bindUserId || 0);
  return !developerId || (!!bindUserId && developerId === bindUserId);
}

/**
 * 构建级联选项：第一级插件类型，第二级分组。
 * deploy 类型按真实分组展示；其他类型统一只有一个默认分组。
 */
function buildCascaderOptions(entries: PluginEntry[]): CascaderOption[] {
  const byType = new Map<string, PluginEntry[]>();
  for (const entry of entries) {
    const list = byType.get(entry.pluginType) || [];
    list.push(entry);
    byType.set(entry.pluginType, list);
  }

  const options: CascaderOption[] = [];
  for (const type of TYPE_ORDER) {
    const list = byType.get(type);
    if (!list || list.length === 0) {
      continue;
    }
    const groups = new Map<string, PluginEntry[]>();
    for (const entry of list) {
      const groupKey = entry.pluginType === "plugin" && entry.group ? entry.group : DEFAULT_GROUP;
      const groupList: PluginEntry[] = groups.get(groupKey) || [];
      groupList.push(entry);
      groups.set(groupKey, groupList);
    }
    const children: CascaderOption[] = Array.from(groups.entries()).map(([groupKey, groupList]) => ({
      value: groupKey,
      label: groupKey,
      children: groupList.map(entry => ({
        value: entry.value,
        label: entry.label,
      })),
    }));
    options.push({
      value: type,
      label: TYPE_LABELS[type] || type,
      children,
    });
  }
  return options;
}

function toCascaderValue(optionValue: string): string[] {
  for (const type of cascaderOptions.value) {
    for (const group of type.children) {
      const leaf = group.children.find((item: any) => item.value === optionValue);
      if (leaf) {
        return [type.value, group.value, leaf.value];
      }
    }
  }
  return [];
}

function pluginFullName(plugin: any) {
  return (plugin.fullName || (plugin.author && plugin.name ? `${plugin.author}/${plugin.name}` : "")).trim();
}

/**
 * 依赖 key 的类型前缀：部署插件用 plugin，addon 插件带 addonType，其余用 pluginType。
 */
function pluginTypePrefix(pluginType?: string, addonType?: string) {
  if (pluginType === "deploy") {
    return "plugin";
  }
  if (pluginType === "addon") {
    return addonType ? `addon:${addonType}` : "addon";
  }
  return `${pluginType || ""}`.trim();
}

function emitValue() {
  emitting.value = true;
  const record: Record<string, string> = {};
  for (const item of items.value) {
    const key = item.optionValue?.trim();
    if (key) {
      // 版本暂不做编辑，默认任意版本
      record[key] = "*";
    }
  }
  emit("update:modelValue", record);
  void nextTick(() => {
    emitting.value = false;
  });
}

function onPluginChange(index: number, path: any[]) {
  const leaf = Array.isArray(path) && path.length > 0 ? String(path[path.length - 1]) : "";
  items.value[index].optionValue = leaf;
  emitValue();
}

function addItem() {
  items.value.push({ optionValue: "" });
}

function removeItem(index: number) {
  items.value.splice(index, 1);
  emitValue();
}
</script>

<style lang="less">
.depend-plugins-input {
  .depend-plugins-input__row {
    display: flex;
    align-items: center;
    margin-bottom: 8px;
    gap: 4px;

    .depend-plugins-input__select {
      min-width: 0;
      flex: 1;
    }
  }
}
</style>
