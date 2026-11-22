<template>
  <div class="local-ca-selector">
    <a-select
      :value="modelValue"
      show-search
      allow-clear
      :filter-option="false"
      :options="options"
      :loading="loading"
      :placeholder="placeholder || '请选择中间CA'"
      @update:value="onChange"
      @search="onSearch"
      @dropdown-visible-change="onOpen"
    />
    <a-button type="link" class="local-ca-selector-manage" @click="openManage">管理本地CA</a-button>
    <LocalCaManage ref="manageRef" @select="onManageSelect" />
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref, watch } from "vue";
import { request } from "/@/api/service";
import LocalCaManage from "./manage.vue";

defineOptions({
  name: "LocalCaSelector",
});

const props = defineProps<{
  modelValue?: number;
  placeholder?: string;
}>();

const emit = defineEmits<{
  "update:modelValue": (value: number) => void;
}>();

const options = ref<any[]>([]);
const loading = ref(false);

function toOption(item: any) {
  const type = item.caType === "intermediate" ? "中间CA" : "根CA";
  return {
    label: `${item.name} (${item.subjectCn}) [${type}]${item.disabled ? " [已禁用]" : ""}`,
    value: item.id,
  };
}

async function load(searchKey?: string) {
  loading.value = true;
  try {
    const list: any[] = await request({
      url: "/cert/local-ca/options",
      method: "post",
      data: { searchKey },
    });
    options.value = (list || []).filter((item: any) => item.caType === "intermediate").map(toOption);
  } finally {
    loading.value = false;
  }
}

async function loadByIds(ids: number[]) {
  if (!ids || ids.length === 0) {
    return;
  }
  const list: any[] = await request({
    url: "/cert/local-ca/getOptionsByIds",
    method: "post",
    data: { ids },
  });
  const exist = new Set(options.value.map(item => item.value));
  for (const item of list || []) {
    if (!exist.has(item.id)) {
      options.value.push(toOption(item));
    }
  }
}

function onSearch(value: string) {
  load(value);
}

function onOpen(open: boolean) {
  if (open) {
    load();
  }
}

function onChange(value: any) {
  emit("update:modelValue", value);
}

const manageRef = ref<any>();

function openManage(event: MouseEvent) {
  event.preventDefault();
  manageRef.value?.open();
}

function onManageSelect(row: any) {
  if (!options.value.some(item => item.value === row.id)) {
    options.value.push(toOption(row));
  }
  emit("update:modelValue", row.id);
}

onMounted(async () => {
  await load();
  if (props.modelValue) {
    await loadByIds([props.modelValue]);
  }
});

watch(
  () => props.modelValue,
  async value => {
    if (value) {
      await loadByIds([value]);
    }
  }
);
</script>

<style lang="less">
.local-ca-selector {
  display: flex;
  align-items: center;
  gap: 8px;
  .local-ca-selector-manage {
    flex-shrink: 0;
    font-size: 12px;
  }
}
</style>
