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

export type PageTurnReq<T = any> = {
  pager: Pager;
  getPage: (pager: Pager) => Promise<PageRes<T>>;
  itemHandle?: (item: T) => Promise<void>;
  batchHandle?: (pageRes: PageRes<T>) => Promise<void>;
};

export async function doPageTurn<T>(req: PageTurnReq<T>) {
  let count = 0;
  const { pager, getPage, itemHandle, batchHandle } = req;
  while (true) {
    const pageRes = await getPage(pager);
    if (!pageRes || !pageRes.list || pageRes.list.length === 0) {
      break;
    }
    count += pageRes.list.length;
    if (batchHandle) {
      await batchHandle(pageRes);
    }
    if (itemHandle) {
      for (const item of pageRes.list) {
        await itemHandle(item);
      }
    }
    if (pageRes.total && pageRes.total >= 0 && count >= pageRes.total) {
      //遍历完成
      break;
    }
    pager.pageNo++;
  }
  return count;
}
