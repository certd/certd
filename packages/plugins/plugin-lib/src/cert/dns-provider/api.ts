import { HttpClient, ILogger, utils } from "@certd/basic";
import { IAccess, IAccessService, IServiceGetter, PageRes, PageSearch, Registrable } from "@certd/pipeline";

export type DnsProviderDefine = Registrable & {
  accessType: string;
  icon?: string;
};

export type CreateRecordOptions = {
  domain: string;
  fullRecord: string;
  hostRecord: string;
  type: string;
  value: any;
};
export type RemoveRecordOptions<T> = {
  recordReq: CreateRecordOptions;
  // 本次创建的dns解析记录，实际上就是createRecord接口的返回值
  recordRes: T;
};

export type DnsProviderContext = {
  access: IAccess;
  logger: ILogger;
  http: HttpClient;
  utils: typeof utils;
  domainParser: IDomainParser;
  serviceGetter: IServiceGetter;
  accessGetter?: IAccessService;
};

export type DomainRecord = {
  id: string;
  domain: string;
};

export type DnsResolveRecord = {
  id: string;
  hostRecord: string;
  fullRecord: string;
  type: string;
  value: string;
};

export interface IDnsProvider<T = any> {
  onInstance(): Promise<void>;

  /**
   * 中文转英文
   * @param domain
   */
  punyCodeEncode(domain: string): string;

  /**
   * 转中文域名
   * @param domain
   */
  punyCodeDecode(domain: string): string;

  createRecord(options: CreateRecordOptions): Promise<T>;

  removeRecord(options: RemoveRecordOptions<T>): Promise<void>;

  setCtx(ctx: DnsProviderContext): void;

  //中文域名是否需要punycode转码，如果返回True，则使用punycode来添加解析记录，否则使用中文域名添加解析记录
  usePunyCode(): boolean;

  getDomainListPage(pager: PageSearch): Promise<PageRes<DomainRecord>>;

  getRecordListPage?(domain: string, pager: PageSearch): Promise<PageRes<DnsResolveRecord>>;
}

export interface ISubDomainsGetter {
  getSubDomains(): Promise<string[]>;
  hasSubDomain(domain: string): Promise<string>;
}

export interface IDomainParser {
  parse(fullDomain: string): Promise<string>;
}

export type DnsVerifier = {
  // dns直接校验
  dnsProviderType?: string;
  dnsProviderAccessId?: number;
};

export type CnameVerifier = {
  hostRecord: string;
  domain: string;
  recordValue: string;
};

export type HttpVerifier = {
  // http校验
  httpUploaderType: string;
  httpUploaderAccess: number;
  httpUploadRootDir: string;
};
export type DomainVerifier = {
  domain: string;
  mainDomain: string;
  type: string;
  dns?: DnsVerifier;
  cname?: CnameVerifier;
  http?: HttpVerifier;
};

export type DomainVerifiers = {
  [key: string]: DomainVerifier;
};

export interface IDomainVerifierGetter {
  getVerifiers(domains: string[]): Promise<DomainVerifiers>;
}
