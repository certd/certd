import { computed, type Ref } from "vue";
import { compute, isFnComputeValue, resolveComputedValue } from "./compute";
import type { DictOption, FnCrudOptions, FnDynamic, FnFormColumn, FnFormContext, FnSearchColumn, FnSearchProps, FnTableLayoutRow, FnTableProps, FnTableRow } from "../types/index";

export function useSearchProps(props: FnCrudOptions): Ref<FnSearchProps> {
  return computed(() => {
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
    return { ...props.search, columns: source };
  });
}

export function useRowHandleProps(props: FnCrudOptions, editRow: (ctx: FnFormContext) => void, openDeleteDialog: (ctx: FnFormContext) => unknown) {
  return computed(() => ({
    width: 160,
    ...props.rowHandle,
    buttons: {
      edit: { text: "编辑", type: "link", onClick: editRow, ...props.rowHandle?.buttons?.edit },
      delete: { text: "删除", type: "link", danger: true, disabled: !props.request.delRequest, onClick: openDeleteDialog, ...props.rowHandle?.buttons?.delete },
      ...Object.fromEntries(Object.entries(props.rowHandle?.buttons || {}).filter(([key]) => key !== "edit" && key !== "delete")),
    },
  }));
}

export function useTableColumns(props: FnCrudOptions, rowHandleProps: Ref<Record<string, any>>) {
  return computed(() => {
    const columns = { ...props.columns };
    if (props.rowHandle && props.rowHandle.show !== false) {
      const rowHandle = rowHandleProps.value;
      columns.rowHandle = { key: "rowHandle", title: "操作", cell: { ...rowHandle, fixed: rowHandle.fixed ?? "right", order: rowHandle.order ?? Infinity } };
    }
    return columns;
  });
}

export function useTableProps(props: FnCrudOptions, columns: Ref<Record<string, any>>, data: Ref<FnTableRow[]>, loading: Ref<boolean>, sort: Ref<{ prop: string; asc: boolean }>): Ref<FnTableProps> {
  return computed(() => ({ ...props.table, columns: columns.value, data: data.value, loading: loading.value || props.table?.loading, sort: sort.value }));
}

export function useActionbarProps(props: FnCrudOptions, openAddForm: () => unknown) {
  return computed(() => ({
    ...props.actionbar,
    buttons: {
      ...props.actionbar?.buttons,
      add: { text: "添加", type: "primary", show: Boolean(props.request.addRequest || props.addForm || props.form), onClick: () => openAddForm(), ...props.actionbar?.buttons?.add },
    },
  }));
}

export function useToolbarProps(props: FnCrudOptions) {
  return computed(() => props.toolbar || { show: true, buttons: {} });
}

export function useTabsProps(props: FnCrudOptions, searchForm: Record<string, any>, tabsCounts: Ref<Record<string, number>>) {
  return computed(() => {
    const refCol = props.tabs?.refCol;
    const cell = refCol && props.columns[refCol]?.cell;
    const dict = cell && !isFnComputeValue(cell) ? cell.dict : undefined;
    const options = dict?.getOptions()?.value;
    const data: DictOption[] = Array.isArray(options) ? options : [];
    const tabs = new Map(data.map(item => [String(item.value), item]));
    for (const [key, item] of Object.entries(props.tabs?.tabs || {})) tabs.set(key, { ...tabs.get(key), ...item });
    return {
      tabs: Array.from(tabs.values())
        .filter(item => item.show !== false)
        .map(item => ({ ...item, count: tabsCounts.value[item.value] ?? item.count ?? 0 })),
      modelValue: searchForm[refCol || ""] ?? "",
      slots: props.tabs?.slots,
    };
  });
}

export function usePaginationProps(props: FnCrudOptions, page: { current: number; pageSize: number; total: number }) {
  return computed(() => ({
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
}

export function useLayoutProps(props: FnCrudOptions): Ref<FnTableLayoutRow[]> {
  return computed(() => props.layout || [{ cols: [{ type: "header" }] }, { cols: [{ type: "actionbar" }, { type: "tabs", style: { flex: 1 } }, { type: "search" }, { type: "toolbar" }] }]);
}

export function useFormProps(props: FnCrudOptions) {
  return computed(() => {
    const columns: Record<string, FnDynamic<FnFormColumn>> = {};
    for (const [key, column] of Object.entries(props.columns)) {
      if (column.form && column.show !== false) columns[key] = compute(context => ({ title: column.title, ...resolveComputedValue(column.form!, context) }));
    }
    return { columns };
  });
}
