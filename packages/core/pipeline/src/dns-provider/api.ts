import { Registrable } from "../registry";

export type DnsProviderDefine = Registrable & {
  accessType: string;
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
  createRecord(options: CreateRecordOptions): Promise<any>;
  removeRecord(options: RemoveRecordOptions): Promise<any>;
}
