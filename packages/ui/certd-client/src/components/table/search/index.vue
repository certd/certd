<template>
  <a-form class="fn-search" v-bind="resolvedProps.formProps" :model="modelValue" @submit.prevent="submit">
    <FnComponentRender
      v-for="column in searchColumns"
      :key="column.key"
      v-bind="getComponent(column)"
      :model-value="modelValue[column.key]"
      scope="table-search"
      @update:model-value="updateField(column.key, $event)"
      @press-enter="submit"
    />
    <FnButton v-for="(button, key) in buttonProps" :key="key" v-bind="button" :context="context" />
  </a-form>
</template>
<script setup lang="ts">
import { computed } from "vue";
import { RotateCcw, Search } from "@lucide/vue";
import FnComponentRender from "../fn-component-render";
import FnButton from "../fn-button.vue";
import type { FnSearchProps, FnSearchColumnResolved, FnFormContext } from "../types";
import { resolveComputedValue } from "../compute";
const props = defineProps<FnSearchProps & { modelValue: Record<string, any> }>();
const emit = defineEmits<{ search: [form: Record<string, any>]; "update:modelValue": [form: Record<string, any>] }>();
const context = computed<FnFormContext>(() => ({ type: "search", form: props.modelValue, columns: props.columns, reset }));
const resolvedProps = computed(() => resolveComputedValue({ columns: props.columns, buttons: props.buttons, formProps: props.formProps }, context.value));
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
function getComponent(column: FnSearchColumnResolved) {
  const resolvedComponent = resolveComputedValue(column.component || {}, context.value) as Record<string, any>;
  const component = { ...resolvedComponent };
  if (column.dict && !component.options) {
    component.options = column.dict.getProps().value;
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
function submit() {
  emit("search", { ...props.modelValue });
}
function updateField(key: string, value: any) {
  emit("update:modelValue", { ...props.modelValue, [key]: value });
}
function reset() {
  const form = { ...props.modelValue };
  for (const column of searchColumns.value) {
    form[column.key] = "";
  }
  emit("update:modelValue", form);
  emit("search", form);
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
