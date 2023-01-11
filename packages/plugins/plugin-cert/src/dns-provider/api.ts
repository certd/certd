import { Registrable } from "@certd/pipeline";

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
};
export type RemoveRecordOptions = CreateRecordOptions & {
  record: any;
};

export interface IDnsProvider {
  onInit(): Promise<void>;
  createRecord(options: CreateRecordOptions): Promise<any>;
  removeRecord(options: RemoveRecordOptions): Promise<any>;
}
