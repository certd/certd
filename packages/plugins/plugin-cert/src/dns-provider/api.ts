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
export type RemoveRecordOptions = CreateRecordOptions & {
  record: any;
};

export type DnsProviderContext = {
  access: IAccess;
  logger: ILogger;
  http: HttpClient;
};

export interface IDnsProvider {
  onInstance(): Promise<void>;
  createRecord(options: CreateRecordOptions): Promise<any>;
  removeRecord(options: RemoveRecordOptions): Promise<any>;
  setCtx(ctx: DnsProviderContext): void;
}
