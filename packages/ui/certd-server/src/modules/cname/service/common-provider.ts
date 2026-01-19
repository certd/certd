import {CreateRecordOptions, DnsProviderContext, DomainRecord, IDnsProvider, RemoveRecordOptions} from '@certd/plugin-cert';
import {PlusService} from '@certd/lib-server';
import punycode from 'punycode.js'
import { Pager, PageRes } from '@certd/pipeline';
export type CommonCnameProvider = {
  id: number;
  domain: string;
  title?: string;
};
export const CommonProviders = [
  {
    id: -1,
    domain: 'cname.certd.com.cn',
    title: '公共CNAME服务',
  },
];

export class CommonDnsProvider implements IDnsProvider {
  ctx: DnsProviderContext;
  config: CommonCnameProvider;
  plusService: PlusService;

  constructor(opts: { config: CommonCnameProvider; plusService: PlusService }) {
    this.config = opts.config;
    this.plusService = opts.plusService;
  }
  getDomainListPage(pager: Pager): Promise<PageRes<DomainRecord>> {
    throw new Error('公共CNAME服务不支持获取域名列表');
  }

  /**
   * 中文转英文
   * @param domain
   */
  punyCodeEncode(domain: string) {
    return punycode.encode(domain);
  }

  /**
   * 转中文域名
   * @param domain
   */
  punyCodeDecode(domain: string) {
    return punycode.decode(domain);
  }


  usePunyCode(): boolean {
    return false
  }

  async onInstance() {
  }

  async createRecord(options: CreateRecordOptions) {
    if (!this.config.domain.endsWith(options.domain)) {
      throw new Error('cname服务域名不匹配');
    }

    await this.plusService.register();

    const res = await this.plusService.requestWithToken({
      url: '/activation/certd/cname/recordCreate',
      method: 'post',
      data: {
        subjectId: await this.plusService.getSubjectId(),
        domain: options.domain,
        hostRecord: options.hostRecord,
        recordValue: options.value,
        providerId: this.config.id,
      },
    });
    return res;
  }

  async removeRecord(options: RemoveRecordOptions<any>) {
    const res = await this.plusService.requestWithToken({
      url: '/activation/certd/cname/recordRemove',
      method: 'post',
      data: {
        subjectId: await this.plusService.getSubjectId(),
        domain: options.recordReq.domain,
        hostRecord: options.recordReq.hostRecord,
        recordValue: options.recordReq.value,
        recordId: options.recordRes?.recordId,
        providerId: this.config.id,
      },
    });
    return res;
  }

  setCtx(ctx: DnsProviderContext): void {
    this.ctx = ctx;
  }
}
