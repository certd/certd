import { CreateRecordOptions, DnsProviderContext, IDnsProvider, RemoveRecordOptions } from "./api";

export abstract class AbstractDnsProvider implements IDnsProvider {
  ctx!: DnsProviderContext;

  setCtx(ctx: DnsProviderContext) {
    this.ctx = ctx;
  }

  abstract createRecord(options: CreateRecordOptions): Promise<any>;

  abstract onInstance(): Promise<void>;

  abstract removeRecord(options: RemoveRecordOptions): Promise<any>;
}
