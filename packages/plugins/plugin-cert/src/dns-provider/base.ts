import { CreateRecordOptions, DnsProviderContext, IDnsProvider, RemoveRecordOptions } from "./api.js";
import psl from "psl";

export abstract class AbstractDnsProvider<T = any> implements IDnsProvider<T> {
  ctx!: DnsProviderContext;

  setCtx(ctx: DnsProviderContext) {
    this.ctx = ctx;
  }

  abstract createRecord(options: CreateRecordOptions): Promise<T>;

  abstract onInstance(): Promise<void>;

  abstract removeRecord(options: RemoveRecordOptions<T>): Promise<void>;
}

export function parseDomain(fullDomain: string) {
  const parsed = psl.parse(fullDomain) as psl.ParsedDomain;
  if (parsed.error) {
    throw new Error(`解析${fullDomain}域名失败:` + JSON.stringify(parsed.error));
  }
  return parsed.domain as string;
}
