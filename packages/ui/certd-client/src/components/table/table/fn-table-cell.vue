<template>
  <div class="fn-table-cell">
    <FnTableCellRender v-if="cell.show !== false && cell.render" :vnode="cell.render(context)" />
    <div v-else-if="cell.show !== false && cell.buttons" class="fn-table-cell-buttons">
      <template v-for="(button, key) in cell.buttons" :key="key"><FnButton v-if="button.show !== false" v-bind="button" :context="context" /></template>
    </div>
    <FnComponentRender v-else-if="cell.show !== false && cell.component" :ref="instance => emit('componentRef', instance)" v-bind="componentProps" scope="table-cell" />
    <template v-else-if="cell.show !== false">{{ value ?? "—" }}</template>
  </div>
</template>
<script setup lang="ts">
import { computed } from "vue";
import FnTableCellRender from "./cell-render";
import FnComponentRender from "../components/fn-component-render";
import FnButton from "../components/fn-button.vue";
import { resolveComputedValue } from "../crud/compute";
import type { FnDynamic, FnTableColumn, FnTableRow, FnTableRowContext } from "../types/index";
const props = defineProps<{ column: FnDynamic<FnTableColumn<FnTableRow>>; context: FnTableRowContext; value: unknown }>();
const emit = defineEmits<{ componentRef: [instance: object | null] }>();
const cell = computed(() => resolveComputedValue(props.column, props.context) as FnTableColumn<FnTableRow>);
const componentProps = computed(() => {
  const component = { ...cell.value.component } as Record<string, any>;
  if (component.modelValue === undefined && component.value === undefined) {
    component.value = props.value;
  }
  if (cell.value.dict && component.options === undefined) {
    component.options = cell.value.dict.getOptions().value;
  }
  return component;
});
</script>
<style lang="less">
.fn-table-cell {
  min-width: 0;
  .fn-table-cell-buttons {
    display: flex;
    align-items: center;
    gap: 8px;
  }
}
</style>
