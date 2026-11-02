<template>
  <div class="fn-table">
    <header v-if="headerLayout.length" class="fn-table-header">
      <div v-for="(row, rowIndex) in headerLayout" :key="rowIndex" class="fn-table-header-row" :style="row.style">
        <div v-for="(col, colIndex) in row.cols" :key="colIndex" class="fn-table-header-col" :class="{ 'is-empty': !col.type }" :style="col.style">
          <div v-if="col.type === 'header'" class="fn-table-heading">
            <slot name="header" />
          </div>
          <div v-else-if="col.type === 'tabs' && crudOptions.tabs && tabsColumn?.cell?.dict" class="fn-table-tabs">
            <FnTabs v-bind="tabOptions" @update:model-value="changeTab" />
          </div>
          <div v-else-if="col.type === 'search' && crudOptions.search" class="fn-table-search">
            <FnSearch v-if="!$slots.search" :options="searchOptions" :get-search-form-data="getSearchFormData" @search="applySearch" />
            <slot v-else name="search" />
            <slot name="tools" />
          </div>
        </div>
      </div>
    </header>
    <div class="fn-table-scroll">
      <table :style="tableStyle">
        <thead>
          <tr>
            <th v-for="column in columns" :key="column.key" :class="columnClasses(column.cell)" :style="columnStyle(column.cell, column.key)" :title="column.title" @click="sortColumn(column.key)">
              <span class="fn-table-heading-content">
                {{ column.title }}
                <ArrowUp v-if="sortState.prop === column.key && sortState.asc" class="fn-table-sort-indicator" />
                <ArrowDown v-else-if="sortState.prop === column.key" class="fn-table-sort-indicator" />
              </span>
              <span class="fn-table-resize-handle" title="调节列宽度" @pointerdown.stop="startResize($event, column)" @click.stop />
            </th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(row, index) in tableData" :key="getRowKey(row, index)">
            <td
              v-for="column in columns"
              :key="column.key"
              :class="columnClasses(column.cell)"
              :style="columnStyle(column.cell, column.key)"
              :title="column.cell.ellipsis ? String(getCellValue(row, column) ?? '') : undefined"
            >
              <FnTableCellRender v-if="column.cell.render" :vnode="column.cell.render({ row, index })" />
              <FnComponentRender v-else-if="column.cell.component" v-bind="getCellComponent(column, row)" scope="table-cell" />
              <template v-else>{{ getCellValue(row, column) ?? "—" }}</template>
            </td>
          </tr>
          <tr v-if="!loading && !tableData.length">
            <td :colspan="columns.length" class="fn-table-empty">{{ crudOptions.emptyText || "暂无数据" }}</td>
          </tr>
          <tr v-if="loading">
            <td :colspan="columns.length" class="fn-table-empty">加载中...</td>
          </tr>
        </tbody>
      </table>
    </div>
    <footer v-if="crudOptions.pagination" class="fn-table-footer">
      <a-pagination v-bind="pagination" @change="changePage" />
    </footer>
  </div>
</template>

<script setup lang="jsx">
import { computed, onMounted, reactive, ref, watch } from "vue";
import { ArrowDown, ArrowUp } from "@lucide/vue";
import FnTableCellRender from "./cell-render";
import FnComponentRender from "./fn-component-render";
import FnSearch from "./search/index.vue";
import FnTabs from "./tabs/index.vue";

const props = defineProps({
  options: {
    type: Object,
    required: true,
  },
});
const crudOptions = computed(() => props.options);
const tableData = ref([]);
const loading = ref(false);
const columns = computed(() => {
  return Object.entries(crudOptions.value.columns)
    .map(([key, column]) => ({ ...column, key, cell: column.cell || {} }))
    .sort((left, right) => (left.order || 0) - (right.order || 0));
});
const searchOptions = computed(() => {
  const configuredColumns = crudOptions.value.search?.columns || {};
  const searchColumns = Object.entries(crudOptions.value.columns)
    .filter(([key, column]) => column.search || configuredColumns[key])
    .map(([key, column]) => {
      const columnSearch = column.search || {};
      const configuredSearch = configuredColumns[key] || {};
      return {
        ...columnSearch,
        ...configuredSearch,
        key,
        order: configuredSearch.order ?? columnSearch.order ?? column.order ?? 0,
        component: {
          ...(columnSearch.component || {}),
          ...(configuredSearch.component || {}),
        },
      };
    })
    .sort((left, right) => left.order - right.order);
  return { ...crudOptions.value.search, columns: searchColumns };
});
const searchFormValues = Object.fromEntries(searchOptions.value.columns.map(column => [column.key, ""]));
const tabsRefCol = crudOptions.value.tabs?.refCol;
if (tabsRefCol) {
  searchFormValues[tabsRefCol] = crudOptions.value.request.query?.[tabsRefCol] || "";
}
const searchFormData = reactive(searchFormValues);
const paginationState = ref({
  current: crudOptions.value.pagination?.current || 1,
  pageSize: crudOptions.value.pagination?.pageSize || 10,
  total: 0,
});
const sortState = reactive({ prop: "", asc: true });
const resizing = ref(false);
const columnWidths = reactive({});
const tabsColumn = computed(() => columns.value.find(column => column.key === crudOptions.value.tabs?.refCol));
const tabOptions = computed(() => {
  const tabs = tabsColumn.value?.cell?.dict?.getOptions().value || [];
  const refCol = crudOptions.value.tabs?.refCol;
  return {
    tabs,
    modelValue: refCol ? searchFormData[refCol] : "",
  };
});
const headerLayout = computed(
  () =>
    crudOptions.value.layout || [
      {
        style: {},
        cols: [
          { type: "header", style: {} },
          { type: "", style: {} },
        ],
      },
      {
        style: {},
        cols: [
          { type: "tabs", style: {} },
          { type: "search", style: {} },
        ],
      },
    ]
);
const pagination = computed(() => ({
  ...paginationState.value,
  pageSizeOptions: crudOptions.value.pagination?.pageSizeOptions || ["10", "20", "50", "100"],
  showSizeChanger: true,
  showLessItems: true,
  showTotal: crudOptions.value.pagination?.showTotal || defaultShowTotal,
  size: "small",
}));
const tableStyle = computed(() => {
  const minWidth = crudOptions.value.table?.minWidth;
  if (!minWidth) {
    return {};
  }
  if (typeof minWidth === "number") {
    return { minWidth: `${minWidth}px` };
  }
  return { minWidth };
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
  if (sortState.prop === prop) {
    sortState.asc = !sortState.asc;
  } else {
    sortState.prop = prop;
    sortState.asc = true;
  }
  paginationState.value.current = 1;
  void refresh();
}

function startResize(event, column) {
  resizing.value = true;
  const startX = event.clientX;
  const initialWidth = getColumnWidth(columnWidths[column.key] || column.cell.width);
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

function getCellComponent(column, row) {
  const cell = column.cell;
  const component = { ...cell.component };
  const value = getCellValue(row, column);
  if (component.modelValue === undefined && component.value === undefined) {
    component.value = value;
  }
  if (cell.dict && component.options === undefined) {
    component.options = cell.dict.getOptions().value;
  }
  return component;
}

function getRowKey(row, index) {
  const rowKey = crudOptions.value.rowKey;
  if (typeof rowKey === "function") {
    return rowKey(row);
  }
  if (rowKey) {
    return row[rowKey] ?? index;
  }
  return row.id ?? index;
}

function defaultShowTotal(count) {
  return `共 ${count} 条`;
}

function getSearchFormData() {
  return searchFormData;
}

async function refresh() {
  loading.value = true;
  try {
    const query = { ...(crudOptions.value.request.query || {}), ...searchFormData };
    const refCol = crudOptions.value.tabs?.refCol;
    if (refCol) {
      query[refCol] = searchFormData[refCol];
    }
    const filteredQuery = Object.fromEntries(Object.entries(query).filter(([, value]) => value !== "" && value !== null && value !== undefined));
    const result = await crudOptions.value.request.pageRequest({
      page: {
        offset: (paginationState.value.current - 1) * paginationState.value.pageSize,
        limit: paginationState.value.pageSize,
      },
      query: filteredQuery,
      sort: sortState.prop ? { prop: sortState.prop, asc: sortState.asc } : undefined,
    });
    tableData.value = result.records || [];
    paginationState.value.total = result.total || 0;
    if (tabsColumn.value?.cell?.dict && result.tabsCounts) {
      const tabsCounts = result.tabsCounts;
      const dict = tabsColumn.value.cell.dict;
      dict.options.value = dict.options.value.map(option => ({ ...option, count: tabsCounts[option.value] || 0 }));
    }
  } finally {
    loading.value = false;
  }
}

function changeTab(value) {
  const refCol = crudOptions.value.tabs?.refCol;
  if (refCol) {
    searchFormData[refCol] = value;
  }
  paginationState.value.current = 1;
  void refresh();
}

function applySearch() {
  paginationState.value.current = 1;
  void refresh();
}

function changePage(page, size) {
  paginationState.value.current = page;
  paginationState.value.pageSize = size;
  void refresh();
}

watch(
  () => JSON.stringify(crudOptions.value.request.query || {}),
  () => {
    paginationState.value.current = 1;
    void refresh();
  }
);

onMounted(() => {
  void refresh();
});

defineExpose({ refresh });
</script>

<style lang="less">
.fn-table {
  display: flex;
  min-height: 0;
  flex: 1;
  flex-direction: column;
  color: #172033;
  padding: 10px 20px;

  .fn-table-header {
    flex: none;
    // padding-bottom: 14px;
  }
  .fn-table-header-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 20px;
  }
  .fn-table-header-col {
    flex: none;
  }
  .fn-table-header-col.is-empty {
    min-width: 1px;
    min-height: 1px;
  }
  .fn-table-search {
    display: flex;
    flex: none;
    align-items: center;
    gap: 8px;
  }
  .fn-table-tabs {
    display: flex;
    flex: none;
    gap: 24px;
    margin-bottom: -1px;
    border-bottom: 1px solid #edf0f4;
    margin-left: -20px;
  }
  .fn-table-heading {
    display: flex;
    flex: none;
    align-items: center;
    gap: 8px;
    margin-bottom: 10px;
    margin-top: 10px;
    h2 {
      margin: 0;
      font-size: 18px;
    }

    p {
      color: #8490a3;
      font-size: 13px;
    }
  }
  .fn-table-scroll {
    min-height: 0;
    flex: 1;
    overflow: auto;
    border-top: 1px solid #edf0f4;
    border-bottom: 1px solid #edf0f4;
    margin: 0 -20px;
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
  .fn-table-footer {
    display: flex;
    flex: none;
    justify-content: flex-start;
    padding-top: 12px;
  }

  .dark & {
    color: rgba(255, 255, 255, 0.85);

    .fn-table-heading p {
      color: rgba(255, 255, 255, 0.55);
    }

    .fn-table-tabs .active {
      color: rgba(255, 255, 255, 0.95);
    }

    .fn-table-tabs .active span {
      color: rgba(255, 255, 255, 0.7);
    }

    .fn-table-tabs,
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

    .ant-pagination,
    .ant-pagination-total-text,
    .ant-pagination-item a,
    .ant-pagination-prev button,
    .ant-pagination-next button {
      color: rgba(255, 255, 255, 0.75);
    }
  }

  @media (max-width: 900px) {
    .fn-table-header {
      .fn-table-header-row {
        align-items: flex-start;
      }
    }
    .fn-table-search {
      flex-wrap: wrap;
    }
  }
}
</style>
