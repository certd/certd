<template>
  <div class="fn-crud" :data-density="density">
    <header class="fn-crud-header">
      <div v-for="(row, rowIndex) in layoutProps" :key="rowIndex" class="fn-crud-row" :style="row.style">
        <div v-for="(col, colIndex) in row.cols" :key="colIndex" class="fn-crud-col" :class="col.type ? `fn-crud-col--${col.type}` : undefined" :style="col.style">
          <div v-if="col.type === 'header' || col.type === 'heading'" class="fn-crud-heading">
            <slot name="header" :selected-row-keys="getSelectedRowKeys()" :selected-rows="getSelectedRows()">
              <FnRender v-if="heading?.slots?.default" :render="heading.slots.default" :ctx="{ selectedRowKeys: getSelectedRowKeys(), selectedRows: getSelectedRows() }" />
              <template v-else-if="heading?.show !== false"
                ><h2>{{ heading?.title }}</h2>
                <p>{{ heading?.description }}</p></template
              >
            </slot>
          </div>
          <FnTabs v-else-if="col.type === 'tabs' && tabsProps" v-bind="tabsProps" :slots="tabsProps.slots" @update:model-value="changeTab" />
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
            <FnToolbar :density="density" :disabled="!preferencesLoaded" @toggle-density="toggleDensity" @open-column-settings="columnSettingsOpen = true" />
            <FnRender v-if="toolbarProps.slots?.default" :render="toolbarProps.slots.default" :ctx="{ selectedRowKeys: getSelectedRowKeys(), selectedRows: getSelectedRows() }" />
            <FnButton v-for="(button, key) in toolbarProps.buttons" :key="key" v-bind="button" />
          </div>
        </div>
      </div>
    </header>
    <FnTable v-if="tableProps.show !== false" v-bind="tableProps" :size="size" :density="density" :column-widths="columnWidths" :slots="tableProps.slots" @sort="changeSort" @column-resize="saveColumnWidth" />
    <FnFormDialog ref="FnFormDialogRef" />
    <FnColumnSettings v-model="columnSettingsOpen" :columns="columnSettingsColumns" @change="changeColumnSettings" @reset="resetColumnSettings" />
    <footer v-if="pagination && pagination.show !== false" class="fn-crud-footer"><FnPagination v-bind="paginationProps" @change="changePage" /></footer>
  </div>
</template>

<script setup lang="ts">
import { computed, getCurrentInstance, onMounted, provide, reactive, ref } from "vue";
import FnTable from "../table/fn-table.vue";
import FnPagination from "../table/fn-pagination.vue";
import FnSearch from "../search/index.vue";
import FnTabs from "../tabs/index.vue";
import FnButton from "../components/fn-button.vue";
import FnToolbar from "../components/fn-toolbar.vue";
import FnColumnSettings from "../components/fn-column-settings.vue";
import FnFormDialog from "../form/fn-form-dialog.vue";
import FnRender from "../components/fn-render";
import { model } from "../modal/dialog";
import { fnCrudContext, fnCrudSearchKey, fnCrudTableSelectionKey, uiContext } from "../provider/context";
import { deepMerge } from "./merge";
import { compute, isFnComputeValue, resolveComputedValue } from "./compute";
import { useActionbarProps, useFormProps, useLayoutProps, usePaginationProps, useRowHandleProps, useSearchProps, useTableColumns, useTableProps, useTabsProps, useToolbarProps } from "./use";
import type { FnCrudExpose, FnCrudOptions, FnFormDialogOptions, FnFormContext, FnTableRow, FnTableRowSelectionChange, FnPaginationTarget, FnComputeContext } from "../types/index";
import { getFnTableRowKey } from "../table/row-key";
import { createFnCrudPreferenceSnapshot, createFnCrudPreferenceStorage, getFnCrudPreferenceKey, mergeFnCrudPreferences } from "./preferences";
import type { FnColumnSettingsColumn, FnCrudPreferences } from "../types/index";

const rawProps = defineProps<FnCrudOptions>();
const instance = getCurrentInstance();
const crudOptions = computed(() => {
  const explicitProps = instance?.vnode.props || {};
  const localOptions: Record<string, any> = {};
  for (const key of Object.keys(rawProps)) {
    if (!instance || Object.prototype.hasOwnProperty.call(explicitProps, key) || key in explicitProps) {
      localOptions[key] = (rawProps as Record<string, any>)[key];
    }
  }
  const userState = localOptions;
  const commonOptions = fnCrudContext.getCommonOptions();
  const stateWithDefaults = deepMerge(userState, commonOptions);
  return deepMerge(stateWithDefaults, userState);
});
const props = new Proxy({} as FnCrudOptions, {
  get: (_target, key: string) => crudOptions.value[key],
});
const { notification } = uiContext.getServices();
const FnFormDialogRef = ref<InstanceType<typeof FnFormDialog>>();
const data = ref<FnTableRow[]>([]);
const columnSettingsOpen = ref(false);
const columnWidths = reactive<Record<string, number>>({});
const preferencesLoaded = ref(false);
const preferencesKey = ref("");
const preferencesStorage = computed(() => createFnCrudPreferenceStorage(props.preferenceStorage));
const savedPreferences = ref<FnCrudPreferences>();
const defaultPageSize = props.pagination?.pageSize || 10;
const size = computed(() => props.table?.size ?? 14);
const densityOverride = ref<"compact" | "comfort">();
const density = computed(() => densityOverride.value || props.table?.density || "comfort");
const loading = ref(false);
const searchForm = reactive<Record<string, any>>({});
provide(fnCrudSearchKey, { form: searchForm, search: applySearch });
const page = reactive({ current: props.pagination?.current || 1, pageSize: defaultPageSize, total: 0 });
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
const searchProps = useSearchProps(props);
const rowHandleProps = useRowHandleProps(props, editRow, openDeleteDialog);
const baseTableColumns = useTableColumns(props, rowHandleProps);
const tableColumns = computed(() => mergeFnCrudPreferences(baseTableColumns.value, savedPreferences.value));
const columnSettingsColumns = computed<FnColumnSettingsColumn[]>(() =>
  Object.entries(tableColumns.value)
    .filter(([key]) => key !== "rowHandle")
    .map(([key, column]) => {
      const cell = column.cell && typeof column.cell === "object" && !isFnComputeValue(column.cell) ? column.cell : {};
      const saved = savedPreferences.value?.columns[key];
      return {
        key,
        title: column.title,
        show: saved?.show ?? (column.show !== false && cell.show !== false),
        fixed: saved?.fixed === null ? undefined : (saved?.fixed ?? cell.fixed),
        order: saved?.order ?? cell.order,
      };
    })
    .sort((left, right) => (left.order ?? Number.MAX_SAFE_INTEGER) - (right.order ?? Number.MAX_SAFE_INTEGER))
    .map(({ key, title, show, fixed }) => ({ key, title, show, fixed }))
);
const tableProps = useTableProps(props, tableColumns, data, loading, sort);
function getSelectedRowKeys(): string[] {
  return [...selectedRowKeys.value];
}
function clearSelectedRowKeys(): void {
  updateSelection([]);
}
function getSelectedRows(): FnTableRow[] {
  return [...selectedRows.value];
}
function getRecordId(row: FnTableRow, index = data.value.indexOf(row)): string {
  return String(getFnTableRowKey(row, index, props.table?.rowKey));
}
function changeSelection(change: FnTableRowSelectionChange): void {
  const nextKeys = new Set(selectedRowKeys.value);
  if (change.type === "row") {
    const key = getRecordId(change.row, change.index);
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
      const key = getRecordId(data.value[index], index);
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
    const currentKeys = new Set(rows.map((row, index) => getRecordId(row, index)));
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
const actionbarProps = useActionbarProps(props, openAddForm);
const toolbarProps = useToolbarProps(props);
const tabsProps = useTabsProps(props, searchForm, tabsCounts);
const paginationProps = usePaginationProps(props, page);
const layoutProps = useLayoutProps(props);
const formProps = useFormProps(props);
let preferenceSaveQueue: Promise<void> = Promise.resolve();

function createCurrentPreferenceSnapshot(): FnCrudPreferences {
  const snapshot = createFnCrudPreferenceSnapshot(tableColumns.value, columnWidths, page.pageSize, density.value);
  for (const [key, column] of Object.entries(tableColumns.value)) {
    if (!isFnComputeValue(column.cell)) {
      continue;
    }
    const saved = savedPreferences.value?.columns[key];
    if (saved) {
      snapshot.columns[key] = { ...saved, width: columnWidths[key] ?? saved.width };
    }
  }
  return snapshot;
}

function savePreferences(): void {
  if (!preferencesLoaded.value || !preferencesKey.value) {
    return;
  }
  const snapshot = createCurrentPreferenceSnapshot();
  savedPreferences.value = snapshot;
  const save = preferenceSaveQueue.then(() => preferencesStorage.value.set(preferencesKey.value, snapshot));
  preferenceSaveQueue = save.catch(error => {
    notification.error({ message: "列表偏好保存失败", description: String(error) });
  });
}

function changeColumnSettings(columns: FnColumnSettingsColumn[]): void {
  const snapshot = createCurrentPreferenceSnapshot();
  for (const [order, column] of columns.entries()) {
    const current = snapshot.columns[column.key];
    if (!current) {
      continue;
    }
    snapshot.columns[column.key] = { ...current, order, show: column.show, fixed: column.fixed ?? null };
  }
  savedPreferences.value = snapshot;
  savePreferences();
}

function toggleDensity(): void {
  densityOverride.value = density.value === "compact" ? "comfort" : "compact";
  props.onToggleDensity?.();
  savePreferences();
}

function saveColumnWidth({ key, width }: { key: string; width: number }): void {
  columnWidths[key] = width;
  const snapshot = createCurrentPreferenceSnapshot();
  if (!snapshot.columns[key]) {
    return;
  }
  snapshot.columns[key].width = width;
  savedPreferences.value = snapshot;
  savePreferences();
}

async function resetColumnSettings(): Promise<void> {
  const defaults = createFnCrudPreferenceSnapshot(baseTableColumns.value, columnWidths, page.pageSize, density.value);
  savedPreferences.value = defaults;
  savePreferences();
  await preferenceSaveQueue;
}

async function initializePreferences(): Promise<void> {
  preferencesKey.value = getFnCrudPreferenceKey(props.id, globalThis.location?.href || "");
  try {
    const preferences = await preferencesStorage.value.get(preferencesKey.value);
    if (preferences) {
      const savedColumns = preferences.columns && typeof preferences.columns === "object" ? preferences.columns : {};
      savedPreferences.value = { ...preferences, columns: savedColumns };
      for (const [key, column] of Object.entries(savedColumns)) {
        if (column.width !== undefined) {
          columnWidths[key] = column.width;
        }
      }
      if (Number.isFinite(preferences.pageSize) && preferences.pageSize > 0) {
        page.pageSize = preferences.pageSize;
      }
      if (preferences.density === "compact" || preferences.density === "comfort") {
        densityOverride.value = preferences.density;
      }
    }
  } catch (error) {
    notification.warning({ message: "读取列表偏好失败，使用默认设置", description: String(error) });
  } finally {
    preferencesLoaded.value = true;
  }
  await refresh();
}

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
  const pageSizeChanged = page.pageSize !== pageSize;
  page.current = current;
  page.pageSize = pageSize;
  if (pageSizeChanged) {
    savePreferences();
  }
  await refresh();
}
function changePage(current: number, pageSize: number): void {
  if (!preferencesLoaded.value) {
    return;
  }
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
  void initializePreferences();
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
  .fn-crud-col--tabs {
    flex: 1;
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
  .dark & {
    .fn-crud-heading p {
      color: rgba(255, 255, 255, 0.55);
    }
  }

  @media (max-width: 650px) {
    .fn-crud-row {
      flex-wrap: wrap;
      align-items: flex-start;
      gap: 8px;
    }

    .fn-crud-col--tabs,
    .fn-crud-col--actionbar,
    .fn-crud-col--search {
      width: 100%;
      flex: 1 1 100%;
    }

    .fn-crud-col--tabs {
      order: -1;
    }

    .fn-crud-col--search .fn-search {
      width: 100%;
    }

    .fn-crud-buttons {
      flex-wrap: wrap;
    }
  }
}
</style>
