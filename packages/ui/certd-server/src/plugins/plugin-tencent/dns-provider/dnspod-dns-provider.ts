import { Autowire, HttpClient, ILogger } from '@certd/pipeline';
import { AbstractDnsProvider, CreateRecordOptions, IsDnsProvider, RemoveRecordOptions } from '@certd/plugin-cert';
import * as _ from 'lodash-es';
import { DnspodAccess } from '../access/index.js';

@IsDnsProvider({
  name: 'dnspod',
  title: 'dnspod(已过时,请尽快换成腾讯云)',
  desc: '请尽快换成腾讯云类型',
  accessType: 'dnspod',
})
export class DnspodDnsProvider extends AbstractDnsProvider {
  @Autowire()
  http!: HttpClient;

  @Autowire()
  access!: DnspodAccess;
  @Autowire()
  logger!: ILogger;

  loginToken: any;

  endpoint = '';
  async onInstance() {
    const access: DnspodAccess = this.access as DnspodAccess;
    this.loginToken = access.id + ',' + access.token;
    this.endpoint = access.endpoint || 'https://dnsapi.cn';
  }

  async doRequest(options: any, successCodes: string[] = []) {
    const config: any = {
      // @ts-ignore
      method: 'post',
      formData: {
        login_token: this.loginToken,
        format: 'json',
        lang: 'cn',
        error_on_empty: 'no',
      },
      timeout: 5000,
    };
    _.merge(config, options);

    const ret: any = await this.http.request(config);
    if (!ret || !ret.status) {
      const code = ret.status.code;
      if (code !== '1' || !successCodes.includes(code)) {
        throw new Error('请求失败：' + ret.status.message + ',api=' + config.url);
      }
    }
    return ret;
  }

  async getDomainList() {
    const ret = await this.doRequest({
      url: this.access.endpoint + '/Domain.List',
    });
    this.logger.info('dnspod 域名列表：', ret.domains);
    return ret.domains;
  }

  async createRecord(options: CreateRecordOptions): Promise<any> {
    const { fullRecord, value, type } = options;
    this.logger.info('添加域名解析：', fullRecord, value);
    const domainItem = await this.matchDomain(fullRecord);
    const domain = domainItem.name;
    const rr = fullRecord.replace('.' + domain, '');

    const ret = await this.doRequest(
      {
        url: this.access.endpoint + '/Record.Create',
        formData: {
          domain,
          sub_domain: rr,
          record_type: type,
          record_line: '默认',
          value: value,
          mx: 1,
        },
      },
      ['104']
    ); // 104错误码为记录已存在，无需再次添加
    this.logger.info('添加域名解析成功:', fullRecord, value, JSON.stringify(ret.record));
    return ret.record;
  }

  async removeRecord(options: RemoveRecordOptions<any>) {
    const { fullRecord, value, record } = options;
    const domain = await this.matchDomain(fullRecord);

    const ret = await this.doRequest({
      url: this.access.endpoint + '/Record.Remove',
      formData: {
        domain,
        record_id: record.id,
      },
    });
    this.logger.info('删除域名解析成功:', fullRecord, value);
    return ret.RecordId;
  }

  async matchDomain(dnsRecord: any) {
    const list = await this.getDomainList();
    if (list == null) {
      throw new Error('域名列表不能为空');
    }
    let domain = null;
    for (const item of list) {
      if (_.endsWith(dnsRecord, '.' + item.name)) {
        domain = item;
        break;
      }
    }
    if (!domain) {
      throw new Error('找不到域名,请检查域名是否正确：' + dnsRecord);
    }
    return domain;
  }
}
new DnspodDnsProvider();
