<template>
  <a-form class="fn-search" v-bind="resolvedProps.formProps" :model="searchState.form" @submit.prevent="submit">
    <FnRender v-if="props.slots?.before" :render="props.slots.before" :ctx="context" />
    <FnComponentRender
      v-for="column in searchColumns"
      :key="column.key"
      v-bind="getComponent(column)"
      :model-value="searchState.form[column.key]"
      scope="table-search"
      @update:model-value="updateField(column.key, $event)"
      @press-enter="submit"
    />
    <FnRender v-if="props.slots?.buttons" :render="props.slots.buttons" :ctx="{ ...context, buttons: buttonProps }" />
    <template v-else><FnButton v-for="(button, key) in buttonProps" :key="key" v-bind="button" :context="context" /></template>
    <FnRender v-if="props.slots?.after" :render="props.slots.after" :ctx="context" />
  </a-form>
</template>
<script setup lang="ts">
import { computed, inject } from "vue";
import { RotateCcw, Search } from "@lucide/vue";
import FnComponentRender from "../fn-component-render";
import FnButton from "../fn-button.vue";
import FnRender from "../fn-render";
import type { FnSearchProps, FnSearchColumn, FnSearchColumnResolved, FnComputeContext } from "../types";
import { resolveComputedValue } from "../compute";
import { fnCrudSearchKey } from "../context";
const props = defineProps<FnSearchProps>();
const searchState = inject(fnCrudSearchKey);
if (!searchState) {
  throw new Error("FnSearch 必须在 FnCrud 内使用");
}
const context = computed<FnComputeContext>(() => ({ type: "search", form: searchState.form, columns: props.columns, reset, search: searchState.search }));
const resolvedProps = computed(
  () =>
    resolveComputedValue({ columns: props.columns, buttons: props.buttons, formProps: props.formProps }, context.value) as Omit<FnSearchProps, "columns"> & {
      columns: Record<string, FnSearchColumn>;
    }
);
const searchColumns = computed(() =>
  Object.entries(resolvedProps.value.columns)
    .map(([key, column]) => ({ ...column, key }))
    .filter(column => column.show !== false)
    .sort((a, b) => (a.order || 0) - (b.order || 0))
);
const buttonProps = computed(
  () =>
    resolvedProps.value.buttons || {
      search: { text: "查询", type: "default", icon: Search, onClick: submit },
      reset: { text: "重置", type: "default", icon: RotateCcw, onClick: reset },
    }
);
function getComponent(column: FnSearchColumnResolved): Record<string, any> {
  const resolvedComponent = resolveComputedValue(column.component || {}, context.value) as Record<string, any>;
  const component = { ...resolvedComponent };
  if (column.dict && !component.options) {
    component.options = column.dict.getOptions().value;
  }
  if (column.width) {
    let width = column.width;
    if (typeof width === "number") {
      width = `${width}px`;
    }
    component.style = { ...component.style, width };
  }
  return component;
}
function submit(): void {
  searchState.search();
}
function updateField(key: string, value: unknown): void {
  searchState.form[key] = value;
}
function reset(): void {
  for (const column of searchColumns.value) {
    searchState.form[column.key] = "";
  }
  searchState.search();
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
