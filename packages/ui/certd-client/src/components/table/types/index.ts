import type { Component, ComputedRef, CSSProperties, Ref, VNodeChild } from "vue";

export type FnDynamic<T> = T | FnComputeValue<T>;
export type FnTableRow = Record<string, any>;
export type FnTableRowSelectionChange<Row = FnTableRow> = { type: "row"; row: Row; index: number; selected: boolean } | { type: "page"; selected: boolean };

export type DictValue = string | number | boolean;
export type DictComponentType = "select" | "checkbox" | "radio" | "switch";
export interface DictOption {
  label: string;
  value: string;
  color?: string;
  icon?: string;
  count?: number;
  show?: boolean;
}
export type DictOptionsRef = Ref<DictOption[]>;
export type GetDictOptionsRef = () => DictOptionsRef;

export interface FnDictStore {
  __options: DictOptionsRef;
  value?: string;
  label?: string | ((row: FnTableRow) => string);
  getData?: () => Promise<DictOption[]>;
  getNodesByValues?: (values: Array<string | number>) => Promise<FnTableRow[]>;
  fetching: boolean;
  getOptions: () => DictOptionsRef;
  __fetch: () => Promise<void>;
}
export interface FnFormInstance<Form = Record<string, any>> {
  save: () => Promise<any>;
  reset: () => Form;
  getForm: () => Form;
  getContext: () => FnFormContext;
  validate: () => Promise<boolean>;
}

export interface FnFormDialogInstance<Form = Record<string, any>> {
  open: (options: FnFormDialogOptions<Form>, computeOptions?: FnComputeValue<Partial<Omit<FnFormDialogOptions<Form>, "columns">>>) => Promise<Form | undefined>;
  close: () => void;
  getFormData: () => Form | undefined;
}

export interface FnIconProps {
  icon: Component;
  size?: number;
}

export interface FnSearchColumnResolved extends FnSearchColumn {
  key: string;
}

export interface FnModalService {
  openDialog<Result = unknown>(Props: FnDialogProps<Result>): Promise<Result | undefined>;
}
export interface FnModalProps {
  open?: boolean;
  title?: string;
  width?: number | string;
  draggable?: boolean;
  confirmLoading?: boolean;
  buttons?: Partial<Record<"reset" | "cancel" | "confirm", FnButtonProps>>;
  footer?: boolean | null;
  slots?: FnSlots;
}
export interface FnModalContext {
  open: Readonly<Ref<boolean>>;
  fullscreen: Readonly<Ref<boolean>>;
  loading: Ref<boolean>;
  openModal: () => void;
  close: () => void;
  setFullscreen: (value: boolean) => void;
}
export interface FnModalInstance {
  state: { open: ComputedRef<boolean>; fullscreen: Ref<boolean> };
  openModal: () => void;
  close: () => void;
  setFullscreen: (value: boolean) => void;
}
export type FnRenderSlot = (ctx?: Record<string, any>) => VNodeChild;
export type FnSlots = Record<string, FnRenderSlot>;
export interface FnDialogRecord {
  id: number;
  open: boolean;
  loading: boolean;
  Props: FnDialogProps<any>;
  resolve: (value: any) => void;
  result?: any;
}

export interface FnFormContext {
  type: "form" | "row" | "search";
  form?: Record<string, any>; //添加、编辑、search表单数据 /行数据
  row?: Record<string, any>; //行数据
  formRef?: any;
  mode?: string; //add ,edit
  columns?: Record<string, any>; //表单列配置
  index?: number;
  getComponentRef?: (key?: string) => any; //字段组件ref
  validate?: () => Promise<boolean>;
  reset?: () => void;
  [key: string]: any;
}

export interface FnComputeContext<Row = any, Form = Record<string, any>> {
  type: "row" | "search" | "form";
  row?: Row;
  index?: number;
  getComponentRef?: (key?: string) => any;
  form?: Form;
  formRef?: FnFormInstance<Form>;
  mode?: string;
  validate?: () => Promise<boolean>;
  reset?: () => void;
  columns?: Record<string, any>;
  modal?: FnModalContext;
  dialogCtx?: FnDialogContext;
  submit?: () => Promise<void>;
  close?: () => void;
  [key: string]: any;
}

export interface FnTableRowContext<Row = FnTableRow> extends FnComputeContext<Row, Row> {
  type: "row";
  row: Row;
  form: Row;
  index: number;
}

export interface FnSearchContext {
  type: "search";
  form: Record<string, any>;
  columns: Record<string, FnSearchColumn>;
  reset: () => void;
  search: () => void;
}

export interface FnCrudSearchState {
  form: Record<string, any>;
  search: () => void;
}

export interface FnComputeValue<T = any> {
  readonly __fnCompute: true;
  readonly computeFn: (context: FnComputeContext) => T;
}

export type FnDialogContext = {
  close: () => void;
  confirm: () => void;
  loading: Ref<boolean>;
  open: Ref<boolean>;
  formCtx?: FnFormContext;
};

export interface FnDialogProps<Result = any> {
  title: string;
  body?: () => VNodeChild;
  width?: number | string;
  draggable?: boolean;
  buttons?: Partial<Record<"reset" | "cancel" | "confirm", FnButtonProps>>;
  footer?: boolean | null;
  onOpen?: (ctx: FnDialogContext) => void;
  onClose?: (ctx: FnDialogContext) => void;
  onOpened?: (ctx: FnDialogContext) => void;
  slots?: FnSlots;
}

export interface FnFormProps<Form = Record<string, any>> {
  dialog?: Omit<FnDialogProps<Form>, "body">;
  title?: string;
  width?: number | string;
  draggable?: boolean;
  columns: Record<string, FnFormColumn>;
  mode?: string;
  initialForm?: Form;
  labelCol?: Record<string, any>;
  wrapperCol?: Record<string, any>;
  formProps?: Record<string, any>;
  onSubmit?: (ctx: FnFormContext) => any | Promise<any>;
  onReset?: (ctx: FnFormContext) => any | Promise<any>;
  slots?: FnSlots;
}

export type FnFormDialogOptions<Form = Record<string, any>> = Omit<FnFormProps<Form>, "columns"> & {
  columns: Record<string, FnDynamic<FnFormColumn>>;
};

export type FnComponentProps = {
  name?: string;
  vModel?: string;
  props?: Record<string, any>;
  [key: string]: any;
};

export interface FnFormColumn {
  key?: string;
  title?: string;
  order?: number;
  span?: number;
  show?: boolean;
  component?: FnComponentProps;
  rules?: any[];
  itemProps?: Record<string, any>;
  slots?: FnSlots;
  value?: any; //默认值
  [key: string]: any;
}

export interface FnButtonItem {
  key: string;
  label: string;
  show?: boolean;
  disabled?: boolean;
  danger?: boolean;
  icon?: Component;
  click?: (context: FnFormContext) => void;
  onClick?: (context: FnFormContext) => void;
}

export interface FnButtonProps {
  context?: FnFormContext;
  show?: boolean;
  type?: string;
  text?: string;
  icon?: Component;
  shape?: "default" | "circle" | "round";
  buttonType?: "button" | "dropdown";
  tooltip?: string | { title: string };
  primaryColor?: string;
  loading?: boolean;
  disabled?: boolean;
  danger?: boolean;
  click?: (ctx: FnFormContext) => void;
  onClick?: (ctx: FnFormContext) => void;
  items?: FnButtonItem[];
}

export interface FnCrudColumn<Row = any> {
  show?: boolean;
  key: string;
  title: string;
  search?: FnDynamic<FnSearchColumn>;
  cell?: FnDynamic<FnTableColumn<Row>>;
  form?: FnDynamic<FnFormColumn>;
}

export interface FnTableColumn<Row = any> {
  buttons?: Record<string, FnButtonProps>;
  show?: boolean;
  title?: string;
  width?: number | string;
  class?: string;
  align?: "left" | "center" | "right";
  ellipsis?: boolean;
  fixed?: "left" | "right";
  dict?: FnDictStore;
  order?: number;
  component?: Record<string, any>;
  render?: (ctx: FnTableRowContext<Row>) => VNodeChild;
  slots?: FnSlots;
}

export interface FnTablePageQuery {
  page: {
    offset: number;
    limit: number;
  };
  query: Record<string, any>;
  sort?: {
    prop: string;
    asc: boolean;
  };
}

export interface FnTablePageResult<Row = any> {
  records: Row[];
  total: number;
  tabsCounts?: Record<string, number>;
}

export interface FnActionbarProps {
  show?: boolean;
  buttons: Record<string, FnButtonProps>;
  slots?: FnSlots;
}

export interface FnPaginationProps {
  show?: boolean;
  current?: number;
  pageSize?: number;
  pageSizeOptions?: string[];
  simple?: boolean;
  showSizeChanger?: boolean;
  showQuickJumper?: boolean;
  total?: number;
  showTotal?: (total: number) => string;
  primaryColor?: string;
}
export interface FnPaginationTarget {
  current: number;
  pageSize: number;
}

export interface FnRowSelectOptions<Row = FnTableRow> {
  title?: string;
  type?: "single" | "multiple";
  onChange?: (keys: Array<string | number>, rows: Row[]) => void;
  crossPage?: boolean;
  initialSelectedKeys?: Array<string | number>;
}

export interface FnTableProps {
  columns?: Record<string, FnCrudColumn<FnTableRow>>;
  data: FnTableRow[];
  sort?: { prop: string; asc: boolean };
  show?: boolean;
  loading?: boolean;
  minWidth?: number | string;
  rowKey?: string | ((row: FnTableRow) => string | number);
  emptyText?: string;
  slots?: FnSlots;
}

export interface FnTableSelectionContext {
  title?: string;
  type?: "single" | "multiple";
  selectedRowKeys: Readonly<Ref<Array<string | number>>>;
  changeSelection: (change: FnTableRowSelectionChange<FnTableRow>) => void;
}

export interface FnTabsProps {
  refCol?: string;
  tabs?: Record<string, DictOption>; //以refCol引用生成之后再与tabs合并
  slots?: FnSlots;
}
export interface FnHeadingProps {
  show?: boolean;
  title?: string;
  description?: string;
  slots?: FnSlots;
}
export interface FnCrudOptions<Row = any> {
  id?: string;
  rowHandle?: FnTableColumn<Row>;
  rowSelect?: FnRowSelectOptions<Row>;
  columns: Record<string, FnCrudColumn<Row>>;
  layout?: FnTableLayoutRow[];
  search?: Omit<FnSearchProps, "columns"> & { columns?: Record<string, FnSearchColumn> };
  actionbar?: FnActionbarProps;
  toolbar?: FnActionbarProps;
  heading?: FnHeadingProps;
  tabs?: FnTabsProps;
  form?: FnDynamic<Omit<FnFormDialogOptions, "columns">>;
  editForm?: FnDynamic<Omit<FnFormDialogOptions, "columns">>;
  addForm?: FnDynamic<Omit<FnFormDialogOptions, "columns">>;
  request: {
    pageRequest: (query: FnTablePageQuery) => Promise<FnTablePageResult<Row>>;
    addRequest?: (form: Record<string, any>) => Promise<any>;
    editRequest?: (form: Record<string, any>) => Promise<any>;
    delRequest?: (id: string | number) => Promise<any>;
    infoRequest?: (id: string | number) => Promise<Record<string, any>>;
  };
  table?: Omit<FnTableProps, "columns" | "data" | "sort">;
  pagination?: FnPaginationProps;
  slots?: FnSlots;
}

export interface FnTableSelectProps<Row = FnTableRow> {
  modelValue?: string | number;
  crudOptions: FnCrudOptions<Row>;
  dict: FnDictStore;
  title?: string;
  placeholder?: string;
  disabled?: boolean;
  allowClear?: boolean;
}

export interface FnCrudExpose<Row = any> {
  search: {
    getSearchForm: () => Record<string, any>;
  };
  form: {
    openAddForm: (initialForm?: Record<string, any>) => Promise<Record<string, any> | undefined>;
    openEditForm: (row: Row, initialForm?: Record<string, any>) => Promise<Record<string, any> | undefined>;
    openFormDialog: (options: FnFormDialogOptions) => Promise<Record<string, any> | undefined>;
    getFormData: () => Record<string, any> | undefined;
    close: () => void;
  };
  table: {
    /** Returns all selected keys, including keys retained across pages. */
    getSelectedRowKeys: () => Array<string | number>;
    /** Returns only selected rows present on the current page. */
    getSelectedRows: () => Row[];
    clearSelection: () => void;
    refresh: () => Promise<void>;
    delete: (rowOrId: Row | string | number) => Promise<void>;
    turnPage: (pagination: FnPaginationTarget) => Promise<void>;
  };
}

export type FnTableLayoutItem = "header" | "tabs" | "search" | "actionbar" | "toolbar" | "";
export interface FnTableLayoutCol {
  type: FnTableLayoutItem;
  style?: CSSProperties;
}
export interface FnTableLayoutRow {
  style?: CSSProperties;
  cols: FnTableLayoutCol[];
}
export type FnTablePropsRef = Ref<FnTableProps>;

export interface FnSearchColumn {
  show?: boolean;
  order?: number;
  component?: Record<string, any>;
  width?: number | string;
  dict?: FnDictStore;
}

export interface FnSearchProps {
  show?: boolean;
  columns: Record<string, FnDynamic<FnSearchColumn>>;
  buttons?: Record<string, FnButtonProps>;
  formProps?: Record<string, any>;
  slots?: FnSlots;
}
