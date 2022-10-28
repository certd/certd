import { Registrable } from "../registry";
import { dnsProviderRegistry } from "./registry";
import { AbstractDnsProvider } from "./abstract-dns-provider";

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
  getDefine(): DnsProviderDefine;
  createRecord(options: CreateRecordOptions): Promise<any>;

  removeRecord(options: RemoveRecordOptions): Promise<any>;
}

export function IsDnsProvider(define: (() => DnsProviderDefine) | DnsProviderDefine) {
  return function (target: typeof AbstractDnsProvider) {
    if (define instanceof Function) {
      target.prototype.define = define();
    } else {
      target.prototype.define = define;
    }
    dnsProviderRegistry.install(target);
  };
}
