import { HttpClient, ILogger } from "@certd/basic";
import { IAccessService, IRuntimeDepsService, PageRes, PageSearch } from "@certd/pipeline";
import punycode from "punycode.js";
import { CreateRecordOptions, DnsProviderContext, DnsProviderDefine, DnsResolveRecord, DomainRecord, IDnsProvider, RemoveRecordOptions } from "./api.js";
import { dnsProviderRegistry } from "./registry.js";
export abstract class AbstractDnsProvider<T = any> implements IDnsProvider<T> {
  ctx!: DnsProviderContext;
  http!: HttpClient;
  logger!: ILogger;
  runtimeDepsService?: IRuntimeDepsService;

  async importRuntime(specifier: string) {
    if (!this.runtimeDepsService) {
      throw new Error("runtimeDepsService 未初始化");
    }
    return await this.runtimeDepsService.importRuntime(specifier, this.logger);
  }

  usePunyCode(): boolean {
    //是否使用punycode来添加解析记录
    //默认都使用原始中文域名来添加
    return false;
  }

  /**
   * 中文转英文
   * @param domain
   */
  punyCodeEncode(domain: string) {
    return punycode.toASCII(domain);
  }

  /**
   * 转中文域名
   * @param domain
   */
  punyCodeDecode(domain: string) {
    return punycode.toUnicode(domain);
  }

  async setCtx(ctx: DnsProviderContext) {
    this.ctx = ctx;
    this.logger = ctx.logger;
    this.http = ctx.http;
    if (!this.runtimeDepsService && this.ctx.serviceGetter) {
      this.runtimeDepsService = await this.ctx.serviceGetter.get("runtimeDepsService");
    }
  }

  async parseDomain(fullDomain: string) {
    return await this.ctx.domainParser.parse(fullDomain);
  }

  abstract createRecord(options: CreateRecordOptions): Promise<T>;

  abstract onInstance(): Promise<void>;

  abstract removeRecord(options: RemoveRecordOptions<T>): Promise<void>;

  async getDomainListPage(req: PageSearch): Promise<PageRes<DomainRecord>> {
    throw new Error("Method not implemented.");
  }

  async getRecordListPage(domain: string, req: PageSearch): Promise<PageRes<DnsResolveRecord>> {
    throw new Error("Method not implemented.");
  }
}

export async function createDnsProvider(opts: { dnsProviderType: string; context: DnsProviderContext }): Promise<IDnsProvider> {
  const { dnsProviderType, context } = opts;
  const dnsProviderPlugin = dnsProviderRegistry.get(dnsProviderType);
  const DnsProviderClass = await dnsProviderPlugin.target();
  const dnsProviderDefine = dnsProviderPlugin.define as DnsProviderDefine;
  if (dnsProviderDefine.deprecated) {
    context.logger.warn(dnsProviderDefine.deprecated);
  }

  if (!context.accessGetter) {
    const accessGetter: IAccessService = await context.serviceGetter.get("accessService");
    context.accessGetter = accessGetter;
  }
  context.define = dnsProviderDefine;
  // @ts-ignore
  const dnsProvider: IDnsProvider = new DnsProviderClass();
  await dnsProvider.setCtx(context);
  await dnsProvider.onInstance();
  return dnsProvider;
}
