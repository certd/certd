import { CreateRecordOptions, DnsProviderContext, DnsProviderDefine, IDnsProvider, RemoveRecordOptions } from "./api.js";
import { dnsProviderRegistry } from "./registry.js";
import { HttpClient, ILogger } from "@certd/basic";
import punycode from "punycode.js";
export abstract class AbstractDnsProvider<T = any> implements IDnsProvider<T> {
  ctx!: DnsProviderContext;
  http!: HttpClient;
  logger!: ILogger;

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

  setCtx(ctx: DnsProviderContext) {
    this.ctx = ctx;
    this.logger = ctx.logger;
    this.http = ctx.http;
  }

  async parseDomain(fullDomain: string) {
    return await this.ctx.domainParser.parse(fullDomain);
  }

  abstract createRecord(options: CreateRecordOptions): Promise<T>;

  abstract onInstance(): Promise<void>;

  abstract removeRecord(options: RemoveRecordOptions<T>): Promise<void>;
}

export async function createDnsProvider(opts: { dnsProviderType: string; context: DnsProviderContext }): Promise<IDnsProvider> {
  const { dnsProviderType, context } = opts;
  const dnsProviderPlugin = dnsProviderRegistry.get(dnsProviderType);
  const DnsProviderClass = await dnsProviderPlugin.target();
  const dnsProviderDefine = dnsProviderPlugin.define as DnsProviderDefine;
  if (dnsProviderDefine.deprecated) {
    context.logger.warn(dnsProviderDefine.deprecated);
  }
  // @ts-ignore
  const dnsProvider: IDnsProvider = new DnsProviderClass();
  dnsProvider.setCtx(context);
  await dnsProvider.onInstance();
  return dnsProvider;
}
