<template>
  <div class="fn-search">
    <template v-for="column in columns" :key="column.key">
      <FnComponentRender v-bind="getComponent(column)" v-model:model-value="searchFormData[column.key]" scope="table-search" @update:model-value="setValue(column.key, $event)" @press-enter="submit" />
    </template>
    <a-button :aria-label="options.searchText || '查询'" :title="options.searchText || '查询'" @click="submit">
      <template #icon><SearchOutlined /></template>
    </a-button>
    <a-button v-if="options.showReset !== false" @click="reset">{{ options.resetText || "重置" }}</a-button>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import FnComponentRender from "../fn-component-render";
import { SearchOutlined } from "@ant-design/icons-vue";

const props = defineProps({
  options: { type: Object, required: true },
  getSearchFormData: { type: Function, required: true },
});
const emit = defineEmits(["search"]);
const searchFormData = props.getSearchFormData();
const columns = computed(() => {
  const source = Array.isArray(props.options.columns) ? Object.fromEntries(props.options.columns.map(column => [column.key, column])) : props.options.columns;
  return Object.entries(source)
    .map(([key, column]) => ({ ...column, key }))
    .sort((left, right) => (left.order || 0) - (right.order || 0));
});
function getOptions(column) {
  if (column.dict) {
    return column.dict.getOptions().value;
  }
  return column.options || [];
}

function getComponent(column) {
  const component = { ...(column.component || {}) };
  if (column.dict && !component.options) {
    component.options = getOptions(column);
  }
  if (column.placeholder != null && component.placeholder == null) {
    component.placeholder = column.placeholder;
  }
  if (column.allowClear != null && component.allowClear == null) {
    component.allowClear = column.allowClear;
  }
  if (column.width && component.style == null) {
    component.style = { width: typeof column.width === "number" ? `${column.width}px` : column.width };
  }
  return component;
}

function setValue(key, value) {
  searchFormData[key] = value;
}

function submit() {
  emit("search", { ...searchFormData });
}

function reset() {
  for (const column of columns.value) {
    searchFormData[column.key] = "";
  }
  submit();
}
</script>

<style lang="less">
.fn-search {
  display: flex;
  flex: none;
  align-items: center;
  gap: 8px;
  @media (max-width: 650px) {
    flex-wrap: wrap;
    > * {
      flex: 1 1 auto;
      min-width: 120px;
    }
  }
}
</style>
