import { HttpClient, IAccess, ILogger, Registrable, utils } from "@certd/pipeline";

export type DnsProviderDefine = Registrable & {
  accessType: string;
  autowire?: {
    [key: string]: any;
  };
};

export type CreateRecordOptions = {
  domain: string;
  fullRecord: string;
  hostRecord: string;
  type: string;
  value: any;
};
export type RemoveRecordOptions<T> = {
  recordReq: CreateRecordOptions;
  // 本次创建的dns解析记录，实际上就是createRecord接口的返回值
  recordRes: T;
};

export type DnsProviderContext = {
  access: IAccess;
  logger: ILogger;
  http: HttpClient;
  utils: typeof utils;
};

export interface IDnsProvider<T = any> {
  onInstance(): Promise<void>;
  createRecord(options: CreateRecordOptions): Promise<T>;
  removeRecord(options: RemoveRecordOptions<T>): Promise<void>;
  setCtx(ctx: DnsProviderContext): void;
}
