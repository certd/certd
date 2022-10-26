import { Registrable } from "../registry";
import { dnsProviderRegistry } from "./registry";

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

export function IsDnsProvider(define: DnsProviderDefine) {
  return function (target: any) {
    target.define = define;
    dnsProviderRegistry.install(target);
  };
}
