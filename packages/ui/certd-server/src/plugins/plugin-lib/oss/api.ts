import { IAccessService } from "@certd/pipeline";
import { ILogger, utils } from "@certd/basic";
import dayjs from "dayjs";

export type OssClientRemoveByOpts = {
  dir?: string;
  //删除多少天前的文件
  beforeDays?: number;
};

export type OssFileItem = {
  //文件全路径
  path: string;
  size: number;
  //毫秒时间戳
  lastModified: number;
};

export type IOssClient = {
  upload: (fileName: string, fileContent: Buffer) => Promise<void>;
  remove: (fileName: string, opts?: { joinRootDir?: boolean }) => Promise<void>;

  download: (fileName: string, savePath: string) => Promise<void>;

  removeBy: (removeByOpts: OssClientRemoveByOpts) => Promise<void>;

  listDir: (dir: string) => Promise<OssFileItem[]>;
};

export type OssClientContext = {
  accessService: IAccessService;
  logger: ILogger;
  utils: typeof utils;
};

export abstract class BaseOssClient<A> implements IOssClient {
  rootDir: string = "";
  access: A = null;
  logger: ILogger;
  utils: typeof utils;
  ctx: OssClientContext;

  protected constructor(opts: { rootDir?: string; access: A }) {
    this.rootDir = opts.rootDir || "";
    this.access = opts.access;
  }

  join(...strs: string[]) {
    let res = "";
    for (const item of strs) {
      if (item) {
        if (!res) {
          res = item;
        } else {
          res += "/" + item;
        }
      }
    }
    res = res.replace(/[\\/]+/g, "/");
    return res;
  }

  async setCtx(ctx: any) {
    // set context
    this.ctx = ctx;
    this.logger = ctx.logger;
    this.utils = ctx.utils;
    await this.init();
  }

  async init() {
    // do nothing
  }

  abstract remove(fileName: string, opts?: { joinRootDir?: boolean }): Promise<void>;
  abstract upload(fileName: string, fileContent: Buffer): Promise<void>;
  abstract download(fileName: string, savePath: string): Promise<void>;
  abstract listDir(dir: string): Promise<OssFileItem[]>;

  async removeBy(removeByOpts: OssClientRemoveByOpts): Promise<void> {
    const list = await this.listDir(removeByOpts.dir);
    // removeByOpts.beforeDays = 0;
    const beforeDate = dayjs().subtract(removeByOpts.beforeDays, "day");
    for (const item of list) {
      if (item.lastModified && item.lastModified < beforeDate.valueOf()) {
        await this.remove(item.path, { joinRootDir: false });
      }
    }
  }
}
