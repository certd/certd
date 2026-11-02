import type { CSSProperties, Ref, VNodeChild } from "vue";
import type { DictStore, DictOption } from "./dict";

export interface FnTableColumn<Row = any> {
  key: string;
  title: string;
  order?: number;
  search?: FnSearchColumn;
  cell?: FnTableCell<Row>;
}

export interface FnTableCell<Row = any> {
  width?: number | string;
  class?: string;
  align?: "left" | "center" | "right";
  ellipsis?: boolean;
  fixed?: "left" | "right";
  dict?: DictStore;
  component?: Record<string, any>;
  render?: (ctx: { row: Row; index: number }) => VNodeChild;
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

export interface FnTableOptions<Row = any> {
  columns: Record<string, FnTableColumn<Row>>;
  layout?: FnTableLayoutRow[];
  search?: FnSearchOptions;
  request: {
    pageRequest: (query: FnTablePageQuery) => Promise<FnTablePageResult<Row>>;
    query?: Record<string, any>;
  };
  tabs?: {
    refCol: string;
  };
  rowKey?: string | ((row: Row) => string | number);
  loading?: boolean;
  table?: {
    minWidth?: number | string;
  };
  pagination?: {
    current?: number;
    pageSize?: number;
    pageSizeOptions?: string[];
    showTotal?: (total: number) => string;
  };
  emptyText?: string;
}

export type FnTableLayoutItem = "header" | "tabs" | "search" | "";
export interface FnTableLayoutCol {
  type: FnTableLayoutItem;
  style?: CSSProperties;
}
export interface FnTableLayoutRow {
  style?: CSSProperties;
  cols: FnTableLayoutCol[];
}
export type FnTableOptionsRef<Row = any> = Ref<FnTableOptions<Row>>;

export interface FnTabsOptions {
  tabs: DictOption[];
  modelValue: string;
}

export interface FnSearchColumn {
  order?: number;
  component?: Record<string, any>;
  placeholder?: string;
  width?: number | string;
  allowClear?: boolean;
  options?: DictOption[];
  dict?: DictStore;
}

export interface FnSearchOptions {
  columns: Record<string, FnSearchColumn>;
  searchText?: string;
  resetText?: string;
  showReset?: boolean;
}
