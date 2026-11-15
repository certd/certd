<template>
  <div class="fn-table" :aria-busy="loading">
    <FnRender v-if="slots?.top" :render="slots.top" :ctx="{ data, loading }" />
    <div class="fn-table-scroll">
      <table :style="tableStyle">
        <thead>
          <tr>
            <th v-if="rowSelection" class="fn-table-selection-column">
              <a-checkbox
                v-if="rowSelection.type !== 'single'"
                :aria-label="rowSelection.title || '选择当前页'"
                :checked="pageSelection.checked"
                :indeterminate="pageSelection.indeterminate"
                @change="event => togglePageSelection(event.target.checked)"
              />
            </th>
            <th v-for="column in columns" :key="column.key" :class="columnClasses(column)" :style="columnStyle(column, column.key)" :title="column.title" @click="sortColumn(column.key)">
              <FnRender v-if="column.slots?.header" :render="column.slots.header" :ctx="{ column }" />
              <template v-else>
                <span class="fn-table-heading-content">
                  {{ column.title }}
                  <ArrowUp v-if="sort.prop === column.key && sort.asc" class="fn-table-sort-indicator" />
                  <ArrowDown v-else-if="sort.prop === column.key" class="fn-table-sort-indicator" />
                </span>
              </template>
              <span class="fn-table-resize-handle" title="调节列宽度" @pointerdown.stop="startResize($event, column)" @click.stop />
            </th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(row, index) in data" :key="getRowKey(row, index)" :class="{ 'fn-table-row-selectable': rowSelection?.type === 'single' }" @click="selectRowOnClick(row, index, $event)">
            <td v-if="slots?.row" :colspan="columns.length + (rowSelection ? 1 : 0)"><FnRender :render="slots.row" :ctx="{ row, index }" /></td>
            <template v-else>
              <td v-if="rowSelection" class="fn-table-selection-column">
                <a-radio v-if="rowSelection.type === 'single'" :aria-label="`选择第 ${index + 1} 条记录`" :checked="isRowSelected(row, index)" @change="() => selectRowOnChange(row, index, true)" />
                <a-checkbox v-else :aria-label="`选择第 ${index + 1} 条记录`" :checked="isRowSelected(row, index)" @change="event => selectRowOnChange(row, index, event.target.checked)" />
              </td>
              <td v-for="column in columns" :key="column.key" :class="columnClasses(column)" :style="columnStyle(column, column.key)" :title="column.ellipsis ? String(getCellValue(row, column) ?? '') : undefined">
                <FnRender v-if="column.slots?.default" :render="column.slots.default" :ctx="getRowContext(row, index)" />
                <template v-else>
                  <FnTableCell :column="getCellColumn(column)" :context="getRowContext(row, index)" :value="getCellValue(row, column)" @component-ref="setCellComponentRef(row, column.key, $event)" />
                </template>
              </td>
            </template>
          </tr>
          <tr v-if="!data.length">
            <td :colspan="columns.length + (rowSelection ? 1 : 0)" class="fn-table-empty">
              <FnRender v-if="slots?.empty" :render="slots.empty" :ctx="{ columns, loading }" /><template v-else>{{ emptyText || "暂无数据" }}</template>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
    <FnRender v-if="slots?.bottom" :render="slots.bottom" :ctx="{ data, loading }" />
    <div v-if="loading" class="fn-table-loading" role="status" aria-live="polite">
      <a-spin />
      <span>加载中...</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ArrowDown, ArrowUp } from "@lucide/vue";
import { computed, inject, reactive, ref, type CSSProperties } from "vue";
import FnTableCell from "./fn-table-cell.vue";
import FnRender from "../components/fn-render";
import { isFnComputeValue } from "../crud/compute";
import type { FnDynamic, FnTableColumn, FnTableProps, FnTableRow, FnTableRowContext } from "../types/index";
import { getFnTableRowKey } from "./row-key";
import { fnCrudTableSelectionKey } from "../provider/context";

type FnTableColumnConfig = FnTableColumn<FnTableRow> & { key: string };
const props = withDefaults(defineProps<FnTableProps>(), { data: () => [], loading: false, emptyText: "暂无数据", sort: () => ({ prop: "", asc: true }) });
const selection = inject(fnCrudTableSelectionKey, undefined);
const slots = computed(() => props.slots);
const columns = computed(() => {
  const result: FnTableColumnConfig[] = [];
  for (const [key, column] of Object.entries(props.columns || {})) {
    // 行组件依赖实际 row，必须留到 FnTable 渲染每一行时解析。
    const cell = column.cell && !isFnComputeValue(column.cell) ? column.cell : {};
    if (column.show === false || cell.show === false) {
      continue;
    }
    result.push({ ...cell, key, title: cell.title ?? column.title });
  }
  return result.sort((left, right) => (left.order ?? Number.MAX_SAFE_INTEGER) - (right.order ?? Number.MAX_SAFE_INTEGER));
});
function getCellColumn(column: FnTableColumnConfig): FnDynamic<FnTableColumn<FnTableRow>> {
  return props.columns?.[column.key]?.cell || column;
}
const rowContextColumns = computed(() => {
  return props.columns || {};
});
const emit = defineEmits<{
  sort: [value: { prop: string; asc: boolean }];
}>();
const resizing = ref(false);
const columnWidths = reactive<Record<string, number>>({});
const cellComponentRefs = new Map<string, unknown>();
const selectedRowKeys = computed(() => (selection?.selectedRowKeys.value || []).map(String));
const rowSelection = computed(() => (selection ? { title: selection.title, type: selection.type ?? "multiple" } : undefined));
const pageSelection = computed(() => {
  const pageKeys = props.data.map((row, index) => String(getRowKey(row, index)));
  const selectedCount = pageKeys.filter(key => selectedRowKeys.value.includes(key)).length;
  return {
    checked: pageKeys.length > 0 && selectedCount === pageKeys.length,
    indeterminate: selectedCount > 0 && selectedCount < pageKeys.length,
  };
});
const tableStyle = computed(() => {
  if (typeof props.minWidth === "number") {
    return { minWidth: `${props.minWidth}px` };
  }
  return { minWidth: props.minWidth };
});
function columnStyle(column: FnTableColumnConfig, key: string): CSSProperties {
  const style: CSSProperties = {};
  const width = columnWidths[key] || column.width;
  if (width) {
    style.width = typeof width === "number" ? `${width}px` : width;
  }
  if (column.align) {
    style.textAlign = column.align;
  }
  if (column.ellipsis) {
    style.overflow = "hidden";
    style.textOverflow = "ellipsis";
  }
  return style;
}

function sortColumn(prop: string): void {
  if (resizing.value) {
    return;
  }
  let asc = true;
  if (props.sort?.prop === prop) {
    asc = !props.sort.asc;
  }
  emit("sort", { prop, asc });
}

function startResize(event: PointerEvent, column: FnTableColumnConfig) {
  resizing.value = true;
  const startX = event.clientX;
  const initialWidth = getColumnWidth(columnWidths[column.key] || column.width);
  const onPointerMove = (moveEvent: PointerEvent) => {
    const width = Math.max(50, initialWidth + moveEvent.clientX - startX);
    columnWidths[column.key] = width;
  };
  const onPointerUp = () => {
    window.removeEventListener("pointermove", onPointerMove);
    window.removeEventListener("pointerup", onPointerUp);
    window.setTimeout(() => {
      resizing.value = false;
    });
  };
  window.addEventListener("pointermove", onPointerMove);
  window.addEventListener("pointerup", onPointerUp);
}

function getColumnWidth(width: number | string | undefined): number {
  if (typeof width === "number") {
    return width;
  }
  if (typeof width === "string") {
    const parsedWidth = Number.parseFloat(width);
    if (!Number.isNaN(parsedWidth)) {
      return parsedWidth;
    }
  }
  return 120;
}

function columnClasses(column: FnTableColumnConfig): Array<string | undefined> {
  return [column.class, column.fixed ? `fn-table-fixed-${column.fixed}` : undefined];
}

function getCellValue(row: FnTableRow, column: FnTableColumnConfig): unknown {
  return column.key.split(".").reduce<unknown>((value, key) => {
    if (typeof value !== "object" || value === null) {
      return undefined;
    }
    return (value as Record<string, unknown>)[key];
  }, row);
}

function getRowContext(row: FnTableRow, index: number): FnTableRowContext {
  return { type: "row", row, form: row, index, columns: rowContextColumns.value, getComponentRef: (key?: string) => getCellComponentRef(row, key) };
}
function componentRefKey(row: FnTableRow, key?: string): string {
  return `${String(getRowKey(row, props.data.indexOf(row)))}:${key || "default"}`;
}

function setCellComponentRef(row: FnTableRow, key: string, instance: unknown): void {
  const refKey = componentRefKey(row, key);
  if (instance) {
    cellComponentRefs.set(refKey, instance);
  } else {
    cellComponentRefs.delete(refKey);
  }
}

function getCellComponentRef(row: FnTableRow, key?: string): unknown {
  return cellComponentRefs.get(componentRefKey(row, key));
}

function getRowKey(row: FnTableRow, index: number): string | number {
  return getFnTableRowKey(row, index, props.rowKey);
}

function isRowSelected(row: FnTableRow, index: number): boolean {
  return selectedRowKeys.value.includes(String(getRowKey(row, index)));
}

function selectRowOnChange(row: FnTableRow, index: number, selected: boolean): void {
  selection?.changeSelection({ type: "row", row, index, selected });
}

function selectRowOnClick(row: FnTableRow, index: number, event: MouseEvent): void {
  if (rowSelection.value?.type !== "single") {
    return;
  }
  const target = event.target as HTMLElement;
  if (target.closest("button, a, input, label, [role='button'], .ant-radio-wrapper, .fn-button")) {
    return;
  }
  selectRowOnChange(row, index, true);
}

function togglePageSelection(selected: boolean): void {
  selection?.changeSelection({ type: "page", selected });
}
</script>

<style lang="less">
.fn-table {
  position: relative;
  display: flex;
  min-height: 0;
  flex: 1;
  flex-direction: column;
  color: var(--fn-color-text);
  margin: 0 -20px;

  .fn-table-loading {
    position: absolute;
    inset: 0;
    z-index: 4;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-direction: column;
    gap: 12px;
    color: var(--fn-color-text-secondary);
    background: color-mix(in srgb, var(--fn-color-bg-container) 75%, transparent);
  }

  .fn-table-scroll {
    min-height: 0;
    flex: 1;
    overflow: auto;
    border-top: 1px solid var(--fn-color-border-secondary);
    border-bottom: 1px solid var(--fn-color-border-secondary);
    margin: 0;
  }
  table {
    width: 100%;
    height: fit-content;
    border-collapse: collapse;
    table-layout: fixed;

    th,
    td {
      padding: 14px 16px;
      border-bottom: 1px solid var(--fn-color-border-secondary);
      text-align: left;
      font-size: 13px;
      white-space: nowrap;
    }

    .fn-table-selection-column {
      width: 44px;
      min-width: 44px;
      padding-right: 8px;
      padding-left: 16px;
      text-align: center;
    }

    th {
      position: sticky;
      z-index: 1;
      top: 0;
      cursor: pointer;
      user-select: none;
      color: var(--fn-color-text-tertiary);
      background: var(--fn-color-fill-alter);
      font-size: 12px;
      box-shadow: 0 1px 0 var(--fn-color-border-secondary);
    }

    .fn-table-heading-content {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      svg.fn-table-sort-indicator {
        height: 18px;
      }
    }

    .fn-table-sort-indicator {
      color: var(--fn-color-text-tertiary);
      width: 12px;
    }

    .fn-table-resize-handle {
      position: absolute;
      top: 6px;
      right: 0;
      bottom: 6px;
      width: 8px;
      border-right: 1px solid transparent;
      cursor: col-resize;
    }

    // .fn-table-resize-handle::after {
    //   position: absolute;
    //   top: 50%;
    //   right: -4px;
    //   color: #98a2b1;
    //   content: "↔";
    //   font-size: 11px;
    //   opacity: 0;
    //   transform: translateY(-50%);
    // }

    th:hover .fn-table-resize-handle {
      border-right-color: var(--fn-color-border);
    }

    th:hover .fn-table-resize-handle::after {
      opacity: 1;
    }

    td {
      background: var(--fn-color-bg-container);
      overflow: hidden;
    }
  }
  tbody tr:hover {
    background: var(--fn-color-fill-secondary);
  }
  tbody tr:hover td {
    background: var(--fn-color-fill-secondary);
  }
  tbody tr.fn-table-row-selectable {
    cursor: pointer;
  }
  .fn-table-fixed-left,
  .fn-table-fixed-right {
    position: sticky;
    z-index: 2;
    background: var(--fn-color-bg-container);
  }
  .fn-table-fixed-left {
    left: 0;
    box-shadow: 12px 0 18px -8px rgb(23 32 51 / 18%);
  }
  .fn-table-fixed-right {
    right: 0;
    box-shadow: -12px 0 18px -8px rgb(23 32 51 / 18%);
  }
  th.fn-table-fixed-left,
  th.fn-table-fixed-right {
    z-index: 3;
    background: var(--fn-color-fill-alter);
  }
  .fn-table-empty {
    padding: 42px !important;
    color: var(--fn-color-text-tertiary);
    text-align: center !important;
  }
  .dark & {
    color: var(--fn-color-text);

    .fn-table-loading {
      color: var(--fn-color-text);
      background: color-mix(in srgb, var(--fn-color-bg-container) 75%, transparent);
    }

    .fn-table-scroll,
    th,
    td {
      border-color: var(--fn-color-border-secondary);
    }

    th,
    th.fn-table-fixed-left,
    th.fn-table-fixed-right {
      color: var(--fn-color-text-secondary);
      background: var(--fn-color-fill-alter);
      box-shadow: 0 1px 0 var(--fn-color-border-secondary);
    }

    td {
      background: var(--fn-color-bg-container);
    }

    .fn-table-fixed-left,
    .fn-table-fixed-right {
      background: var(--fn-color-bg-container);
      box-shadow: -12px 0 18px -8px rgb(0 0 0 / 55%);
    }

    th.fn-table-fixed-left,
    th.fn-table-fixed-right {
      background: var(--fn-color-fill-alter);
    }

    tbody tr:hover {
      background: var(--fn-color-fill-secondary);

      .fn-table-fixed-left,
      .fn-table-fixed-right {
        background: var(--fn-color-fill-secondary);
      }
    }

    tbody tr:hover td {
      background: var(--fn-color-fill-secondary);
    }
  }
}
</style>
