<template>
  <div class="fn-crud">
    <header class="fn-crud-header">
      <div v-for="(row, rowIndex) in layoutProps" :key="rowIndex" class="fn-crud-row" :style="row.style">
        <div v-for="(col, colIndex) in row.cols" :key="colIndex" class="fn-crud-col" :style="col.style">
          <div v-if="col.type === 'header' || col.type === 'heading'" class="fn-crud-heading">
            <slot name="header">
              <template v-if="heading?.show !== false"
                ><h2>{{ heading?.title }}</h2>
                <p>{{ heading?.description }}</p></template
              >
            </slot>
          </div>
          <FnTabs v-else-if="col.type === 'tabs' && tabs" v-bind="tabsProps" @update:model-value="changeTab" />
          <template v-else-if="col.type === 'search' && searchProps.show !== false">
            <slot name="search">
              <FnSearch v-bind="searchProps" :model-value="searchForm" @update:model-value="Object.assign(searchForm, $event)" @search="applySearch" />
            </slot>
          </template>
          <div v-else-if="col.type === 'actionbar' && actionbarProps.show !== false" class="fn-crud-buttons">
            <template v-for="(button, key) in actionbarProps.buttons" :key="key"><FnButton v-if="button.show !== false" v-bind="button" /></template>
          </div>
          <div v-else-if="col.type === 'toolbar' && toolbarProps.show !== false" class="fn-crud-buttons">
            <FnButton v-for="(button, key) in toolbarProps.buttons" :key="key" v-bind="button" />
          </div>
        </div>
      </div>
    </header>
    <FnTable v-if="tableProps.show !== false" v-bind="tableProps" @sort="changeSort" />
    <FnFormDialog ref="FnFormDialogRef" />
    <footer v-if="pagination && pagination.show !== false" class="fn-crud-footer"><a-pagination v-bind="paginationProps" @change="changePage" /></footer>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, Ref, ref } from "vue";
import FnTable from "./fn-table.vue";
import FnSearch from "./search/index.vue";
import FnTabs from "./tabs/index.vue";
import FnButton from "./fn-button.vue";
import FnFormDialog from "./fn-form-dialog.vue";
import { model } from "./dialog";
import { notification } from "ant-design-vue";
import type { FnCrudOptions, FnFormColumn, FnTableLayoutRow, FnTableProps, FnSearchProps, FnFormProps, FnSearchColumn, DictOption, FnFormContext } from "./types";

const props = defineProps<FnCrudOptions>();
const FnFormDialogRef = ref<InstanceType<typeof FnFormDialog>>();
function openFormDialog(options: FnFormProps) {
  return FnFormDialogRef.value!.open(options);
}
const data = ref<Record<string, any>[]>([]);
const loading = ref(false);
const searchForm = reactive<Record<string, any>>({});
const page = reactive({ current: props.pagination?.current || 1, pageSize: props.pagination?.pageSize || 10, total: 0 });
const sort = ref({ prop: "", asc: true });
const tabsCounts = ref<Record<string, number>>({});
let requestId = 0;
const searchProps: Ref<FnSearchProps> = computed(() => {
  const source = { ...props.search?.columns };
  for (const [key, column] of Object.entries(props.columns)) {
    if (column.search) {
      source[key] = { ...column.search, ...source[key] };
    }
  }
  const searchColumns: Record<string, FnSearchColumn> = {};
  for (const [key, column] of Object.entries(source)) {
    searchColumns[key] = column;
  }
  return { ...props.search, columns: searchColumns };
});
const rowHandleProps = computed(() => ({
  width: 160,
  ...props.rowHandle,
  buttons: {
    edit: { text: "编辑", type: "link", onClick: editRow, ...props.rowHandle?.buttons?.edit },
    delete: { text: "删除", type: "link", danger: true, disabled: !props.request.delRequest, onClick: openDeleteDialog, ...props.rowHandle?.buttons?.delete },
    ...Object.fromEntries(Object.entries(props.rowHandle?.buttons || {}).filter(([key]) => key !== "edit" && key !== "delete")),
  },
}));
const tableProps: Ref<FnTableProps> = computed(() => ({ ...props.table, crudColumns: props.columns, rowHandle: rowHandleProps.value, data: data.value, loading: loading.value || props.table?.loading, sort: sort.value }));
function getRecordId(row: Record<string, any>) {
  const rowKey = props.table?.rowKey;
  if (typeof rowKey === "function") {
    return String(rowKey(row));
  }
  if (rowKey) {
    return String(row[rowKey]);
  }
  return String(row.id);
}
async function editRow(ctx: FnFormContext) {
  if (!ctx.row) {
    return;
  }
  let form = { ...ctx.row };
  if (props.request.infoRequest) {
    form = await props.request.infoRequest(getRecordId(ctx.row));
  }
  await openForm("edit", form);
}
function openDeleteDialog(ctx: FnFormContext) {
  const row = ctx.row;
  const delRequest = props.request.delRequest;
  if (!row || !delRequest) {
    return;
  }
  const id = getRecordId(row);
  return model.confirm({
    title: "确认删除",
    body: () => "确定删除这条记录吗？此操作不可撤销。",
    buttons: {
      confirm: {
        text: "删除",
        danger: true,
        onClick: async () => {
          await delRequest(id);
          notification.success({ message: "删除成功" });
          await refresh();
        },
      },
    },
  });
}
const actionbarProps = computed(() => ({
  ...props.actionbar,
  buttons: {
    ...props.actionbar?.buttons,
    add: { text: "添加", type: "primary", onClick: () => openForm("add"), ...props.actionbar?.buttons?.add },
  },
}));
const toolbarProps = computed(() => props.toolbar || { show: false, buttons: {} });
const tabsProps = computed(() => {
  const refCol = props.tabs?.refCol;
  const dict = refCol && props.columns[refCol]?.cell?.dict;
  let data: any[] = [];
  if (dict) {
    data = dict.getProps().value;
  }
  function resolveCrudTabs(data: DictOption[], overrides: Record<string, DictOption> | undefined, counts: Record<string, number>) {
    const tabs = new Map(data.map(item => [String(item.value), item]));
    for (const [key, item] of Object.entries(overrides || {})) {
      tabs.set(key, { ...tabs.get(key), ...item });
    }
    return Array.from(tabs.values())
      .filter(item => item.show !== false)
      .map(item => ({ ...item, count: counts[item.value] ?? item.count ?? 0 }));
  }
  return { tabs: resolveCrudTabs(data, props.tabs?.tabs, tabsCounts.value), modelValue: searchForm[refCol || ""] ?? "" };
});
const paginationProps = computed(() => ({
  ...page,
  pageSizeOptions: props.pagination?.pageSizeProps || ["10", "20", "50", "100"],
  showSizeChanger: true,
  size: "small",
  showTotal: props.pagination?.showTotal || ((total: number) => `共 ${total} 条`),
}));
const layoutProps: Ref<FnTableLayoutRow[]> = computed(() => props.layout || ([{ cols: [{ type: "heading" }, { type: "toolbar" }] }, { cols: [{ type: "tabs" }, { type: "actionbar" }, { type: "search" }] }] as any));
const formProps = computed(() => {
  const columns: Record<string, FnFormColumn> = {};
  for (const [key, column] of Object.entries(props.columns)) {
    if (column.form && column.show !== false) {
      columns[key] = { title: column.title, ...column.form };
    }
  }
  return { ...props.form, columns };
});

async function refresh() {
  const id = ++requestId;
  loading.value = true;
  try {
    const searchEntries = Object.entries(searchForm);
    const queryEntries = searchEntries.filter(([, value]) => value !== "" && value !== null && value !== undefined);
    const query = Object.fromEntries(queryEntries);
    let sortQuery;
    if (sort.value.prop) {
      sortQuery = sort.value;
    }
    const result = await props.request.pageRequest({ page: { offset: (page.current - 1) * page.pageSize, limit: page.pageSize }, query, sort: sortQuery });
    if (id !== requestId) {
      return;
    }
    data.value = result.records || [];
    page.total = result.total || 0;
    tabsCounts.value = result.tabsCounts || {};
  } finally {
    if (id === requestId) {
      loading.value = false;
    }
  }
}
function applySearch() {
  page.current = 1;
  void refresh();
}
function changeTab(value: string) {
  if (props.tabs?.refCol) {
    searchForm[props.tabs.refCol] = value;
  }
  applySearch();
}
function changeSort(value: { prop: string; asc: boolean }) {
  sort.value = value;
  applySearch();
}
function changePage(current: number, pageSize: number) {
  page.current = current;
  page.pageSize = pageSize;
  void refresh();
}
async function openForm(mode = "add", initialForm: Record<string, any> = {}) {
  let modeForm = props.addForm;
  if (mode === "edit") {
    modeForm = props.editForm;
  }
  const options = { ...formProps.value, ...modeForm };
  return await openFormDialog({
    ...options,
    mode,
    initialForm,
    onSubmit: async ctx => {
      if (options.onSubmit) {
        await options.onSubmit(ctx);
      } else if (props.request.editRequest) {
        await props.request.editRequest(ctx.form || {});
      }
      await refresh();
    },
  });
}
onMounted(() => {
  void refresh();
});
defineExpose({ refresh, openForm, openFormDialog, getSearchFormData: () => searchForm });
</script>

<style lang="less">
.fn-crud {
  display: flex;
  flex: 1;
  min-height: 0;
  flex-direction: column;
  padding: 10px 20px;
  .fn-crud-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 20px;
  }
  .fn-crud-header {
    margin-bottom: 4px;
    .fn-tabs {
      margin-bottom: -3px;
    }
  }
  .fn-crud-col {
    min-width: 0;
  }
  .fn-crud-heading {
    margin: 10px 0;
    h2 {
      margin: 0;
      font-size: 18px;
    }
    p {
      color: #8490a3;
      font-size: 13px;
    }
  }
  .fn-crud-buttons {
    display: flex;
    gap: 8px;
  }
  .fn-crud-footer {
    padding-top: 12px;
  }
  .fn-table {
    padding: 0;
  }
  .dark & {
    .fn-crud-heading p {
      color: rgba(255, 255, 255, 0.55);
    }
  }
}
</style>
