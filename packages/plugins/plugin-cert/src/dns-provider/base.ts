import { CreateRecordOptions, DnsProviderContext, IDnsProvider, RemoveRecordOptions } from "./api.js";

export abstract class AbstractDnsProvider<T = any> implements IDnsProvider<T> {
  ctx!: DnsProviderContext;

  setCtx(ctx: DnsProviderContext) {
    this.ctx = ctx;
  }

  abstract createRecord(options: CreateRecordOptions): Promise<T>;

  abstract onInstance(): Promise<void>;

  abstract removeRecord(options: RemoveRecordOptions<T>): Promise<void>;
}
