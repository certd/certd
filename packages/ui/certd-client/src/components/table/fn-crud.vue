<template>
  <div class="fn-crud">
    <header class="fn-crud-header">
      <div v-for="(row, rowIndex) in layoutProps" :key="rowIndex" class="fn-crud-row" :style="row.style">
        <div v-for="(col, colIndex) in row.cols" :key="colIndex" class="fn-crud-col" :style="col.style">
          <div v-if="col.type === 'header' || col.type === 'heading'" class="fn-crud-heading">
            <slot name="header" :selected-row-keys="getSelectedRowKeys()" :selected-rows="getSelectedRows()">
              <FnRender v-if="heading?.slots?.default" :render="heading.slots.default" :ctx="{ selectedRowKeys: getSelectedRowKeys(), selectedRows: getSelectedRows() }" />
              <template v-else-if="heading?.show !== false"
                ><h2>{{ heading?.title }}</h2>
                <p>{{ heading?.description }}</p></template
              >
            </slot>
          </div>
          <FnTabs v-else-if="col.type === 'tabs' && tabs" v-bind="tabsProps" :slots="tabsProps.slots" @update:model-value="changeTab" />
          <template v-else-if="col.type === 'search' && searchProps.show !== false">
            <slot name="search">
              <FnSearch v-bind="searchProps" />
            </slot>
          </template>
          <div v-else-if="col.type === 'actionbar' && actionbarProps.show !== false" class="fn-crud-buttons">
            <FnRender v-if="actionbarProps.slots?.default" :render="actionbarProps.slots.default" :ctx="{ selectedRowKeys: getSelectedRowKeys(), selectedRows: getSelectedRows() }" />
            <template v-for="(button, key) in actionbarProps.buttons" :key="key"><FnButton v-if="button.show !== false" v-bind="button" /></template>
          </div>
          <div v-else-if="col.type === 'toolbar' && toolbarProps.show !== false" class="fn-crud-buttons">
            <FnRender v-if="toolbarProps.slots?.default" :render="toolbarProps.slots.default" :ctx="{ selectedRowKeys: getSelectedRowKeys(), selectedRows: getSelectedRows() }" />
            <FnButton v-for="(button, key) in toolbarProps.buttons" :key="key" v-bind="button" />
          </div>
        </div>
      </div>
    </header>
    <FnTable v-if="tableProps.show !== false" v-bind="tableProps" :slots="tableProps.slots" @sort="changeSort" />
    <FnFormDialog ref="FnFormDialogRef" />
    <footer v-if="pagination && pagination.show !== false" class="fn-crud-footer"><FnPagination v-bind="paginationProps" @change="changePage" /></footer>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, provide, reactive, ref, type Ref } from "vue";
import FnTable from "./fn-table.vue";
import FnPagination from "./fn-pagination.vue";
import FnSearch from "./search/index.vue";
import FnTabs from "./tabs/index.vue";
import FnButton from "./fn-button.vue";
import FnFormDialog from "./fn-form-dialog.vue";
import FnRender from "./fn-render";
import { model } from "./dialog";
import { notification } from "ant-design-vue";
import { fnCrudSearchKey, fnCrudTableSelectionKey } from "./context";
import { compute, isFnComputeValue, resolveComputedValue } from "./compute";
import type {
  FnCrudExpose,
  FnCrudOptions,
  FnFormColumn,
  FnDynamic,
  FnTableLayoutRow,
  FnTableProps,
  FnSearchProps,
  FnFormDialogOptions,
  FnSearchColumn,
  DictOption,
  FnFormContext,
  FnTableRow,
  FnTableRowSelectionChange,
  FnPaginationTarget,
  FnComputeContext,
} from "./types";
import { getFnTableRowKey } from "./row-key";

const props = defineProps<FnCrudOptions>();
const FnFormDialogRef = ref<InstanceType<typeof FnFormDialog>>();
const data = ref<FnTableRow[]>([]);
const loading = ref(false);
const searchForm = reactive<Record<string, any>>({});
provide(fnCrudSearchKey, { form: searchForm, search: applySearch });
const page = reactive({ current: props.pagination?.current || 1, pageSize: props.pagination?.pageSize || 10, total: 0 });
const sort = ref({ prop: "", asc: true });
const tabsCounts = ref<Record<string, number>>({});
const selectedRowKeys = ref((props.rowSelect?.initialSelectedKeys || []).map(String));
provide(fnCrudTableSelectionKey, {
  title: props.rowSelect?.title,
  type: props.rowSelect?.type,
  selectedRowKeys,
  changeSelection,
});
const selectedRows = computed(() => {
  const selectedKeys = new Set(selectedRowKeys.value);
  return data.value.filter((row, index) => selectedKeys.has(String(getFnTableRowKey(row, index, props.table?.rowKey))));
});
let requestId = 0;
const searchProps: Ref<FnSearchProps> = computed(() => {
  const source: Record<string, FnDynamic<FnSearchColumn>> = { ...props.search?.columns };
  for (const [key, column] of Object.entries(props.columns)) {
    if (column.search) {
      const override = source[key];
      source[key] = compute(context => ({
        ...resolveComputedValue(column.search!, context),
        ...resolveComputedValue(override || {}, context),
      }));
    }
  }
  const searchColumns: Record<string, FnDynamic<FnSearchColumn>> = {};
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
const tableProps: Ref<FnTableProps> = computed(() => ({
  ...props.table,
  columns: tableColumns.value,
  data: data.value,
  loading: loading.value || props.table?.loading,
  sort: sort.value,
}));
const tableColumns = computed(() => {
  const columns = { ...props.columns };
  if (props.rowHandle && props.rowHandle.show !== false) {
    const rowHandle = rowHandleProps.value;
    columns.rowHandle = { key: "rowHandle", title: "操作", cell: { ...rowHandle, order: rowHandle.order ?? Infinity } };
  }
  return columns;
});
function getSelectedRowKeys(): string[] {
  return [...selectedRowKeys.value];
}
function clearSelectedRowKeys(): void {
  updateSelection([]);
}
function getSelectedRows(): FnTableRow[] {
  return [...selectedRows.value];
}
function getRecordId(row: FnTableRow): string {
  return String(getFnTableRowKey(row, data.value.indexOf(row), props.table?.rowKey));
}
function changeSelection(change: FnTableRowSelectionChange): void {
  const nextKeys = new Set(selectedRowKeys.value);
  if (change.type === "row") {
    const key = String(getFnTableRowKey(change.row, change.index, props.table?.rowKey));
    if (props.rowSelect?.type === "single") {
      updateSelection(change.selected ? [key] : []);
      return;
    }
    if (change.selected) {
      nextKeys.add(key);
    } else {
      nextKeys.delete(key);
    }
  } else {
    if (change.selected && !props.rowSelect?.crossPage) {
      nextKeys.clear();
    }
    for (let index = 0; index < data.value.length; index++) {
      const key = getRecordId(data.value[index]);
      if (change.selected) {
        nextKeys.add(key);
      } else {
        nextKeys.delete(key);
      }
    }
  }
  const keys = Array.from(nextKeys);
  updateSelection(keys);
}
function updateSelection(keys: string[]): void {
  selectedRowKeys.value = keys;
  props.rowSelect?.onChange?.([...keys], [...selectedRows.value]);
}
function syncSelectionForRows(rows: FnTableRow[]): void {
  if (!props.rowSelect?.crossPage) {
    const currentKeys = new Set(rows.map((row, index) => String(getFnTableRowKey(row, index, props.table?.rowKey))));
    selectedRowKeys.value = selectedRowKeys.value.filter(key => currentKeys.has(key));
  }
}
async function editRow(ctx: FnFormContext): Promise<void> {
  if (!ctx.row) {
    return;
  }
  await openEditForm(ctx.row);
}
function openDeleteDialog(ctx: FnFormContext): ReturnType<typeof confirmDelete> | undefined {
  const row = ctx.row;
  if (!row || !props.request.delRequest) {
    return;
  }
  return confirmDelete(row);
}
function confirmDelete(rowOrId: FnTableRow | string | number): ReturnType<typeof model.confirm> {
  const id = typeof rowOrId === "object" ? getRecordId(rowOrId) : rowOrId;
  return model.confirm({
    title: "确认删除",
    body: () => "确定删除这条记录吗？此操作不可撤销。",
    buttons: {
      confirm: {
        text: "删除",
        danger: true,
        onClick: () => deleteById(id),
      },
    },
  });
}
async function deleteById(id: string | number): Promise<void> {
  const delRequest = props.request.delRequest;
  if (!delRequest) {
    throw new Error("当前列表未配置删除请求");
  }
  await delRequest(id);
  notification.success({ message: "删除成功" });
  await refresh();
}
const actionbarProps = computed(() => ({
  ...props.actionbar,
  buttons: {
    ...props.actionbar?.buttons,
    add: {
      text: "添加",
      type: "primary",
      show: Boolean(props.request.addRequest || props.addForm || props.form),
      onClick: () => openAddForm(),
      ...props.actionbar?.buttons?.add,
    },
  },
}));
const toolbarProps = computed(() => props.toolbar || { show: false, buttons: {} });
const tabsProps = computed(() => {
  const refCol = props.tabs?.refCol;
  const cell = refCol && props.columns[refCol]?.cell;
  const dict = cell && !isFnComputeValue(cell) ? cell.dict : undefined;
  let data: DictOption[] = [];
  if (dict) {
    data = dict.getOptions().value;
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
  return { tabs: resolveCrudTabs(data, props.tabs?.tabs, tabsCounts.value), modelValue: searchForm[refCol || ""] ?? "", slots: props.tabs?.slots };
});
const paginationProps = computed(() => ({
  ...props.pagination,
  current: page.current,
  pageSize: page.pageSize,
  total: page.total,
  pageSizeOptions: props.pagination?.pageSizeOptions || ["10", "20", "50", "100"],
  simple: props.pagination?.simple ?? false,
  showSizeChanger: props.pagination?.showSizeChanger ?? true,
  showQuickJumper: props.pagination?.showQuickJumper ?? false,
  showTotal: props.pagination?.showTotal || ((total: number) => `共 ${total} 条`),
}));
const layoutProps: Ref<FnTableLayoutRow[]> = computed(() => props.layout || [{ cols: [{ type: "header" }, { type: "toolbar" }] }, { cols: [{ type: "tabs" }, { type: "actionbar" }, { type: "search" }] }]);
const formProps = computed(() => {
  const columns: Record<string, FnDynamic<FnFormColumn>> = {};
  for (const [key, column] of Object.entries(props.columns)) {
    if (column.form && column.show !== false) {
      const source = column.form;
      columns[key] = compute(context => ({ title: column.title, ...resolveComputedValue(source, context) }));
    }
  }
  return { columns };
});

async function refresh(): Promise<void> {
  const id = ++requestId;
  loading.value = true;
  try {
    const searchEntries = Object.entries(searchForm);
    const queryEntries = searchEntries.filter(([, value]) => value !== "" && value !== null && value !== undefined);
    const query = Object.fromEntries(queryEntries);
    let sortQuery: { prop: string; asc: boolean } | undefined;
    if (sort.value.prop) {
      sortQuery = sort.value;
    }
    const result = await props.request.pageRequest({ page: { offset: (page.current - 1) * page.pageSize, limit: page.pageSize }, query, sort: sortQuery });
    if (id !== requestId) {
      return;
    }
    data.value = result.records || [];
    syncSelectionForRows(data.value);
    page.total = result.total || 0;
    tabsCounts.value = result.tabsCounts || {};
  } finally {
    if (id === requestId) {
      loading.value = false;
    }
  }
}
function applySearch(): void {
  page.current = 1;
  void refresh();
}
function changeTab(value: string): void {
  if (props.tabs?.refCol) {
    searchForm[props.tabs.refCol] = value;
  }
  applySearch();
}
function changeSort(value: { prop: string; asc: boolean }): void {
  sort.value = value;
  applySearch();
}
async function turnPage({ current, pageSize }: FnPaginationTarget): Promise<void> {
  page.current = current;
  page.pageSize = pageSize;
  await refresh();
}
function changePage(current: number, pageSize: number): void {
  void turnPage({ current, pageSize });
}
function openFormDialog(options: FnFormDialogOptions): Promise<Record<string, any> | undefined> {
  return FnFormDialogRef.value!.open(options);
}
function openAddForm(initialForm: Record<string, any> = {}): Promise<Record<string, any> | undefined> {
  return openForm("add", initialForm);
}
async function openEditForm(row: FnTableRow, initialForm: Record<string, any> = {}): Promise<Record<string, any> | undefined> {
  let form = { ...row };
  if (props.request.infoRequest) {
    form = await props.request.infoRequest(getRecordId(row));
  }
  return openForm("edit", { ...form, ...initialForm });
}
async function openForm(mode: "add" | "edit", initialForm: Record<string, any> = {}): Promise<Record<string, any> | undefined> {
  const modeOptions = mode === "add" ? props.addForm : props.editForm;
  const dynamicOptions = compute((context: FnComputeContext) => {
    const common = resolveComputedValue(props.form || {}, context) as Omit<FnFormDialogOptions, "columns">;
    const specific = resolveComputedValue(modeOptions || {}, context) as Omit<FnFormDialogOptions, "columns">;
    const options = { ...common, ...specific };
    return {
      ...options,
      onSubmit: async (ctx: FnFormContext) => {
        if (options.onSubmit) {
          await options.onSubmit(ctx);
        } else if (mode === "add" && props.request.addRequest) {
          await props.request.addRequest(ctx.form || {});
        } else if (mode === "edit" && props.request.editRequest) {
          await props.request.editRequest(ctx.form || {});
        } else {
          throw new Error(`当前${mode === "add" ? "新增" : "编辑"}表单未配置提交请求`);
        }
        await refresh();
      },
    };
  });
  return FnFormDialogRef.value!.open(
    {
      ...formProps.value,
      mode,
      initialForm,
    },
    dynamicOptions
  );
}
onMounted(() => {
  void refresh();
});
const exposed: FnCrudExpose = {
  search: { getSearchForm: () => ({ ...searchForm }) },
  form: {
    openAddForm,
    openEditForm,
    openFormDialog,
    getFormData: () => FnFormDialogRef.value?.getFormData(),
    close: () => FnFormDialogRef.value?.close(),
  },
  table: {
    getSelectedRowKeys,
    getSelectedRows,
    clearSelection: clearSelectedRowKeys,
    refresh,
    delete: async rowOrId => {
      await confirmDelete(rowOrId as Record<string, any> | string | number);
    },
    turnPage,
  },
};
defineExpose(exposed);
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
