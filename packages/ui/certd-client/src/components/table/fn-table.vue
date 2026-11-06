<template>
  <div class="fn-table">
    <div class="fn-table-scroll">
      <table :style="tableStyle">
        <thead>
          <tr>
            <th v-for="column in columns" :key="column.key" :class="columnClasses(column)" :style="columnStyle(column, column.key)" :title="column.title" @click="sortColumn(column.key)">
              <span class="fn-table-heading-content">
                {{ column.title }}
                <ArrowUp v-if="sort.prop === column.key && sort.asc" class="fn-table-sort-indicator" />
                <ArrowDown v-else-if="sort.prop === column.key" class="fn-table-sort-indicator" />
              </span>
              <span class="fn-table-resize-handle" title="调节列宽度" @pointerdown.stop="startResize($event, column)" @click.stop />
            </th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(row, index) in data" :key="getRowKey(row, index)">
            <td v-for="column in columns" :key="column.key" :class="columnClasses(column)" :style="columnStyle(column, column.key)" :title="column.ellipsis ? String(getCellValue(row, column) ?? '') : undefined">
              <FnTableCell :column="column" :context="getRowContext(row, index)" :value="getCellValue(row, column)" @component-ref="setCellComponentRef(row, column.key, $event)" />
            </td>
          </tr>
          <tr v-if="!loading && !data.length">
            <td :colspan="columns.length" class="fn-table-empty">{{ emptyText || "暂无数据" }}</td>
          </tr>
          <tr v-if="loading">
            <td :colspan="columns.length" class="fn-table-empty">加载中...</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ArrowDown, ArrowUp } from "@lucide/vue";
import { computed, reactive, ref } from "vue";
import FnTableCell from "./fn-table-cell.vue";
import type { FnTableProps } from "./types";
const props = withDefaults(defineProps<FnTableProps>(), { data: () => [], loading: false, emptyText: "暂无数据", sort: () => ({ prop: "", asc: true }) });
const columns = computed(() => {
  if (props.crudColumns) {
    const result: NonNullable<FnTableProps["columns"]> = [];
    for (const [key, column] of Object.entries(props.crudColumns)) {
      // 行组件依赖实际 row，必须留到 FnTable 渲染每一行时解析。
      const cell = column.cell || {};
      if (column.show === false || cell.show === false) {
        continue;
      }
      result.push({ ...cell, key, title: cell.title ?? column.title });
    }
    if (props.rowHandle && props.rowHandle.show !== false) {
      result.push({ title: "操作", ...props.rowHandle, order: props.rowHandle.order ?? Infinity, key: "rowHandle" });
    }
    return result.sort((left, right) => (left.order || 0) - (right.order || 0));
  }
  return props.columns || [];
});
const emit = defineEmits<{ sort: [value: { prop: string; asc: boolean }] }>();
const resizing = ref(false);
const columnWidths = reactive<Record<string, number>>({});
const cellComponentRefs = new Map();
const tableStyle = computed(() => {
  if (typeof props.minWidth === "number") {
    return { minWidth: `${props.minWidth}px` };
  }
  return { minWidth: props.minWidth };
});
function columnStyle(column, key) {
  const style = {};
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

function sortColumn(prop) {
  if (resizing.value) {
    return;
  }
  let asc = true;
  if (props.sort?.prop === prop) {
    asc = !props.sort.asc;
  }
  emit("sort", { prop, asc });
}

function startResize(event, column) {
  resizing.value = true;
  const startX = event.clientX;
  const initialWidth = getColumnWidth(columnWidths[column.key] || column.width);
  const onPointerMove = moveEvent => {
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

function getColumnWidth(width) {
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

function columnClasses(column) {
  return [column.class, column.fixed ? `fn-table-fixed-${column.fixed}` : undefined];
}

function getCellValue(row, column) {
  return column.key.split(".").reduce((value, key) => value?.[key], row);
}

function getRowContext(row: Record<string, any>, index: number) {
  return { type: "row" as const, row, form: row, index, columns: props.columns, getComponentRef: (key?: string) => getCellComponentRef(row, key) };
}
function componentRefKey(row, key) {
  return `${String(getRowKey(row, props.data.indexOf(row)))}:${key || "default"}`;
}

function setCellComponentRef(row, key, instance) {
  const refKey = componentRefKey(row, key);
  if (instance) {
    cellComponentRefs.set(refKey, instance);
  } else {
    cellComponentRefs.delete(refKey);
  }
}

function getCellComponentRef(row, key) {
  return cellComponentRefs.get(componentRefKey(row, key));
}

function getRowKey(row, index) {
  const rowKey = props.rowKey;
  if (typeof rowKey === "function") {
    return rowKey(row);
  }
  if (rowKey) {
    return row[rowKey] ?? index;
  }
  return row.id ?? index;
}
</script>

<style lang="less">
.fn-table {
  display: flex;
  min-height: 0;
  flex: 1;
  flex-direction: column;
  color: #172033;
  margin: 0 -20px;

  .fn-table-scroll {
    min-height: 0;
    flex: 1;
    overflow: auto;
    border-top: 1px solid #edf0f4;
    border-bottom: 1px solid #edf0f4;
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
      border-bottom: 1px solid #f0f2f5;
      text-align: left;
      font-size: 13px;
      white-space: nowrap;
    }

    th {
      position: sticky;
      z-index: 1;
      top: 0;
      cursor: pointer;
      user-select: none;
      color: #8a95a6;
      background: #fbfcfd;
      font-size: 12px;
      box-shadow: 0 1px 0 #edf0f4;
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
      color: #525252;
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
      border-right-color: #c5ccd6;
    }

    th:hover .fn-table-resize-handle::after {
      opacity: 1;
    }

    td {
      overflow: hidden;
    }
  }
  tbody tr:hover {
    background: #fafafa;
  }
  .fn-table-fixed-left,
  .fn-table-fixed-right {
    position: sticky;
    z-index: 2;
    background: #fff;
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
    background: #fbfcfd;
  }
  .fn-table-empty {
    padding: 42px !important;
    color: #98a2b1;
    text-align: center !important;
  }
  .dark & {
    color: rgba(255, 255, 255, 0.85);

    .fn-table-scroll,
    th,
    td {
      border-color: #303030;
    }

    th,
    th.fn-table-fixed-left,
    th.fn-table-fixed-right {
      color: rgba(255, 255, 255, 0.65);
      background: #1f1f1f;
      box-shadow: 0 1px 0 #303030;
    }

    .fn-table-fixed-left,
    .fn-table-fixed-right {
      background: #1f1f1f;
      box-shadow: -12px 0 18px -8px rgb(0 0 0 / 55%);
    }

    tbody tr:hover {
      background: #262626;

      .fn-table-fixed-left,
      .fn-table-fixed-right {
        background: #262626;
      }
    }
  }
}
</style>
