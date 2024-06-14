import { HttpClient, IAccess, ILogger, Registrable } from "@certd/pipeline";

export type DnsProviderDefine = Registrable & {
  accessType: string;
  autowire?: {
    [key: string]: any;
  };
};

export type CreateRecordOptions = {
  fullRecord: string;
  type: string;
  value: any;
  domain: string;
};
export type RemoveRecordOptions<T> = CreateRecordOptions & {
  // 本次创建的dns解析记录，实际上就是createRecord接口的返回值
  record: T;
};

export type DnsProviderContext = {
  access: IAccess;
  logger: ILogger;
  http: HttpClient;
};

export interface IDnsProvider<T = any> {
  onInstance(): Promise<void>;
  createRecord(options: CreateRecordOptions): Promise<T>;
  removeRecord(options: RemoveRecordOptions<T>): Promise<void>;
  setCtx(ctx: DnsProviderContext): void;
}
