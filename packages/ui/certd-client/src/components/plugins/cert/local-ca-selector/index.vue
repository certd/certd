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
    <a-button v-if="isAdmin" type="link" class="local-ca-selector-manage" @click="openManage">管理本地CA</a-button>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import { useRouter } from "vue-router";
import { request } from "/@/api/service";
import { useUserStore } from "/@/store/user";

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

const router = useRouter();
const userStore = useUserStore();
const isAdmin = computed(() => userStore.isAdmin());
const options = ref<any[]>([]);
const loading = ref(false);

function toOption(item: any) {
  const type = item.caType === "intermediate" ? "中间CA" : "根CA";
  return {
    label: `${item.name} (${item.subjectCn}) [${type}]${item.disabled ? " [已禁用]" : ""}`,
    value: item.id,
    disabled: item.disabled === true,
  };
}

async function load(searchKey?: string) {
  loading.value = true;
  try {
    const list: any[] = await request({
      url: "/sys/local-ca/options",
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
    url: "/sys/local-ca/getOptionsByIds",
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

function openManage(event: MouseEvent) {
  event.preventDefault();
  router.push("/sys/local-ca");
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
