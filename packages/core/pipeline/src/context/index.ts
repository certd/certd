import { IContext } from "../core/index.js";

export type UserContext = IContext;
export type PipelineContext = IContext;

export type PageSearch = {
  pageNo?: number;
  pageSize?: number;
  searchKey?: string;
  // sortBy?: string;
  // sortOrder?: "asc" | "desc";
};

export type PageRes<T = any> = {
  pageNo?: number;
  pageSize?: number;
  total?: number;
  list: T[];
};

export class Pager {
  pageNo: number;
  pageSize: number;
  constructor(req?: PageSearch) {
    this.pageNo = req?.pageNo ?? 1;
    this.pageSize = req?.pageSize || 50;
  }

  getOffset() {
    return (this.pageNo - 1) * (this.pageSize ?? 50);
  }

  setOffset(offset: number) {
    this.pageNo = Math.ceil(offset / (this.pageSize ?? 50)) + 1;
  }
}
