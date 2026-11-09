import type { Component, CSSProperties, Ref, VNodeChild } from "vue";

export type FnDynamic<T> = T | FnComputeValue<T>;

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
export type DictPropsRef = Ref<DictOption[]>;
export type GetDictPropsRef = () => DictPropsRef;

export interface FnDictStore {
  Props: DictPropsRef;
  getData?: () => Promise<DictOption[]>;
  fetching: boolean;
  getProps: () => DictPropsRef;
  fetch: () => Promise<void>;
  renderTag: (value: unknown) => VNodeChild;
  getComponentProps: (type: DictComponentType, value: unknown, label?: string) => Record<string, any>;
}
export interface FnFormInstance<Form = Record<string, any>> {
  save: () => Promise<any>;
  reset: () => Form;
  getForm: () => Form;
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
  footer?: ((ctx: FnDialogContext) => VNodeChild) | null | false;
}
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
  dialogCtx?: FnDialogContext;
  [key: string]: any;
}

export interface FnComputeValue<T = any> {
  readonly __fnCompute: true;
  readonly computeFn: (context: FnFormContext) => T;
}

export type FnDialogContext = {
  close: () => void;
  confirm: () => void;
  loading: boolean;
  formCtx?: FnFormContext;
};

export interface FnDialogProps<Result = any> {
  title: string;
  body?: () => VNodeChild;
  width?: number | string;
  draggable?: boolean;
  buttons?: Partial<Record<"reset" | "cancel" | "confirm", FnButtonProps>>;
  footer?: ((ctx: FnDialogContext) => VNodeChild) | null | false;
  onOpen?: (ctx: FnDialogContext) => void;
  onClose?: (ctx: FnDialogContext) => void;
  onOpened?: (ctx: FnDialogContext) => void;
  slots?: {
    footerLeft?: () => VNodeChild;
    footerRight?: () => VNodeChild;
    headerLeft?: () => VNodeChild;
    headerRight?: () => VNodeChild;
    bodyTop?: () => VNodeChild;
    bodyBottom?: () => VNodeChild;
    actionLeft?: () => VNodeChild;
    actionRight?: () => VNodeChild;
  };
}

export interface FnFormProps<Form = Record<string, any>> {
  dialog?: Omit<FnDialogProps<Form>, "body">;
  title?: string;
  width?: number | string;
  draggable?: boolean;
  columns: Record<string, any>;
  mode?: string;
  initialForm?: Form;
  labelCol?: Record<string, any>;
  wrapperCol?: Record<string, any>;
  formProps?: Record<string, any>;
  onSubmit?: (ctx: FnFormContext) => any | Promise<any>;
  onReset?: (ctx: FnFormContext) => any | Promise<any>;
}

export type FnComponentProps = {
  name?: string;
  vModel?: string;
  props?: Record<string, any>;
  [key: string]: any;
};

export interface FnFormColumn {
  key?: string;
  title?: FnDynamic<string>;
  order?: number;
  span?: number;
  show?: boolean;
  component?: FnComponentProps;
  rules?: any[]; //
  itemProps?: Record<string, any>;
  value?: any; //默认值
  [key: string]: any;
}

export interface FnButtonItem {
  key: string;
  label: string;
  show?: FnDynamic<boolean>;
  disabled?: boolean;
  danger?: boolean;
  icon?: Component;
  click?: (context: FnFormContext) => void;
  onClick?: (context: FnFormContext) => void;
}

export interface FnButtonProps {
  context?: FnFormContext;
  show?: FnDynamic<boolean>;
  type?: string;
  text?: FnDynamic<string>;
  icon?: Component;
  shape?: "default" | "circle" | "round";
  buttonType?: "button" | "dropdown";
  tooltip?: string | { title: string };
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
  title: FnDynamic<string>;
  search?: FnSearchColumn;
  cell?: FnTableColumn<Row>;
  form?: FnFormColumn;
}

export interface FnTableColumn<Row = any> {
  buttons?: Record<string, FnButtonProps>;
  show?: boolean;
  title?: FnDynamic<string>;
  width?: number | string;
  class?: string;
  align?: "left" | "center" | "right";
  ellipsis?: boolean;
  fixed?: "left" | "right";
  dict?: FnDictStore;
  order?: number;
  component?: FnDynamic<Record<string, any>>;
  render?: (ctx: FnFormContext & { row: Row; index: number }) => VNodeChild;
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
}

export interface FnPaginationProps {
  show?: boolean;
  current?: number;
  pageSize?: number;
  pageSizeProps?: string[];
  showTotal?: (total: number) => string;
}

export interface FnTableProps {
  crudColumns?: Record<string, FnCrudColumn>;
  rowHandle?: FnTableColumn;
  rowSelect?: {
    title?: string;
    crossPage?: boolean;
    initialSelectedKeys?: Array<string | number>;
  };
  clearSelectedRowKeys?: () => void;
  columns?: Array<FnTableColumn & { key: string }>;
  data: Record<string, any>[];
  rowSelection?: {
    selectedRowKeys: Array<string | number> | Ref<Array<string | number>>;
    onChange: (selectedRowKeys: string[], selectedRows: Record<string, any>[]) => void;
  };
  sort?: { prop: string; asc: boolean };
  show?: boolean;
  loading?: boolean;
  minWidth?: number | string;
  rowKey?: string | ((row: any) => string | number);
  emptyText?: string;
}

export interface FnTabsProps {
  refCol?: string;
  tabs?: Record<string, DictOption>; //以refCol引用生成之后再与tabs合并
}
export interface FnHeadingProps {
  show?: boolean;
  title?: string;
  description?: string;
}
export interface FnCrudOptions<Row = any> {
  rowHandle?: FnTableColumn<Row>;
  rowSelect?: FnTableProps["rowSelect"];
  columns: Record<string, FnCrudColumn<Row>>;
  layout?: FnTableLayoutRow[];
  search?: FnSearchProps;
  actionbar?: FnActionbarProps;
  toolbar?: FnActionbarProps;
  heading?: FnHeadingProps;
  tabs?: FnTabsProps;
  form?: Omit<FnFormProps, "columns">;
  editForm?: Omit<FnFormProps, "columns">;
  addForm?: Omit<FnFormProps, "columns">;
  request: {
    pageRequest: (query: FnTablePageQuery) => Promise<FnTablePageResult<any>>;
    editRequest?: (form: Record<string, any>) => Promise<any>;
    delRequest?: (id: string) => Promise<any>;
    infoRequest?: (id: string) => Promise<any>;
  };
  table?: Omit<FnTableProps, "columns" | "data" | "sort">;
  pagination?: FnPaginationProps;
}

export type FnTableLayoutItem = "heading" | "tabs" | "search" | "actionbar" | "toolbar" | "";
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
  component?: FnDynamic<Record<string, any>>;
  width?: FnDynamic<number | string>;
  dict?: FnDictStore;
}

export interface FnSearchProps {
  show?: boolean;
  columns: Record<string, FnSearchColumn>;
  buttons?: Record<string, FnButtonProps>;
  formProps?: Record<string, any>;
}
