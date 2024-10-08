import { CreateRecordOptions, DnsProviderContext, DnsProviderDefine, IDnsProvider, RemoveRecordOptions } from "./api.js";
import psl from "psl";
import { dnsProviderRegistry } from "./registry.js";
import { Decorator } from "@certd/pipeline";

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

export async function createDnsProvider(opts: { dnsProviderType: string; context: DnsProviderContext }): Promise<IDnsProvider> {
  const { dnsProviderType, context } = opts;
  const dnsProviderPlugin = dnsProviderRegistry.get(dnsProviderType);
  const DnsProviderClass = dnsProviderPlugin.target;
  const dnsProviderDefine = dnsProviderPlugin.define as DnsProviderDefine;
  if (dnsProviderDefine.deprecated) {
    throw new Error(dnsProviderDefine.deprecated);
  }
  // @ts-ignore
  const dnsProvider: IDnsProvider = new DnsProviderClass();

  Decorator.inject(dnsProviderDefine.autowire, dnsProvider, context);
  dnsProvider.setCtx(context);
  await dnsProvider.onInstance();
  return dnsProvider;
}
