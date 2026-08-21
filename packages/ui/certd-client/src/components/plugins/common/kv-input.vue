<template>
  <div class="kv-input">
    <div v-for="(item, index) of items" :key="index" class="kv-row">
      <a-input :value="item.key" placeholder="名称" class="kv-key" @input="onKeyChange(index, $event)" />
      <span class="kv-sep">:</span>
      <a-input :value="item.value" placeholder="版本" class="kv-value" @input="onValueChange(index, $event)" />
      <a-button type="link" danger @click="removeItem(index)">
        <template #icon><DeleteOutlined /></template>
      </a-button>
    </div>
    <a-button type="dashed" block @click="addItem">
      <template #icon><PlusOutlined /></template>
      添加
    </a-button>
  </div>
</template>

<script lang="ts" setup>
import { nextTick, ref, watch } from "vue";
import { DeleteOutlined, PlusOutlined } from "@ant-design/icons-vue";

const props = defineProps<{
  modelValue: Record<string, string>;
}>();

const emit = defineEmits<{
  (e: "update:modelValue", value: Record<string, string>): void;
}>();

interface KvItem {
  key: string;
  value: string;
}

const items = ref<KvItem[]>([]);

// emitting 必须在 watch（immediate）之前声明，避免 TDZ 报错
const emitting = ref(false);

function initItems(val: Record<string, string>) {
  if (val && typeof val === "object" && !Array.isArray(val)) {
    items.value = Object.entries(val).map(([k, v]) => ({
      key: k,
      value: v ?? "",
    }));
  } else {
    items.value = [];
  }
}

watch(
  () => props.modelValue,
  val => {
    if (emitting.value) {
      // 自身 emit 引起的 modelValue 回写，跳过重建，避免输入框被重置
      return;
    }
    initItems(val);
  },
  { deep: true, immediate: true }
);

function emitValue() {
  emitting.value = true;
  emit("update:modelValue", rebuildRecord());
  void nextTick(() => {
    emitting.value = false;
  });
}

function rebuildRecord(): Record<string, string> {
  const record: Record<string, string> = {};
  for (const item of items.value) {
    const k = item.key?.trim();
    if (k) {
      record[k] = item.value?.trim() ?? "";
    }
  }
  return record;
}

function onKeyChange(index: number, event: Event) {
  const target = event.target as HTMLInputElement;
  items.value[index].key = target.value;
  emitValue();
}

function onValueChange(index: number, event: Event) {
  const target = event.target as HTMLInputElement;
  items.value[index].value = target.value;
  emitValue();
}

function addItem() {
  items.value.push({ key: "", value: "" });
}

function removeItem(index: number) {
  items.value.splice(index, 1);
  emitValue();
}
</script>

<style lang="less" scoped>
.kv-input {
  .kv-row {
    display: flex;
    align-items: center;
    margin-bottom: 8px;
    gap: 4px;
    .kv-key {
      flex: 1;
      min-width: 0;
    }
    .kv-sep {
      flex-shrink: 0;
      padding: 0 2px;
      color: #999;
    }
    .kv-value {
      flex: 1;
      min-width: 0;
    }
  }
}
</style>
