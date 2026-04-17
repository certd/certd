import { AbstractDnsProvider, CreateRecordOptions, IsDnsProvider, RemoveRecordOptions } from '@certd/plugin-cert';

import { TechnitiumAccess } from "./access.js"

type TechnitiumRecord = {
  // 记录创建时返回的数据结构
  zone: {
    name: string;
    type: string;
    internal: boolean;
    dnssecStatus: string;
    disabled: boolean;
  };
  addedRecord: {
    disabled: boolean;
    name: string;
    type: string;
    ttl: number;
    rData: {
      text: string;
    };
    dnssecStatus: string;
    lastUsedOn: string;
  };
};

// 注册Technitium DNS Server的DNS提供商
@IsDnsProvider({
  name: 'technitium',
  title: 'Technitium DNS Server',
  desc: 'Technitium DNS Server 自建DNS服务器',
  icon: 'clarity:server-line',
  accessType: 'technitium',
  order: 10,
})
export class TechnitiumDnsProvider extends AbstractDnsProvider<TechnitiumRecord> {
  access!: TechnitiumAccess;

  async onInstance() {
    this.access = this.ctx.access as TechnitiumAccess;
    this.logger.debug('access', this.access);
  }

  /**
   * 创建DNS解析记录，用于验证域名所有权
   */
  async createRecord(options: CreateRecordOptions): Promise<TechnitiumRecord> {
    const { fullRecord, value, type, domain } = options;
    this.logger.info('添加域名解析：', fullRecord, value, type, domain);

    // 构建API URL
    const apiUrl = `${this.access.apiUrl}/api/zones/records/add`;
    
    // 构建查询参数
    const params = new URLSearchParams({
      domain: fullRecord,
      type: type,
      text: value,
    });

    // 调用Technitium API创建TXT记录
    const response = await this.access.doRequest({ url: apiUrl, method: 'post', params: params });

    this.logger.info('创建域名解析成功:', fullRecord, value);
    return response as TechnitiumRecord;
  }

  /**
   * 删除DNS解析记录,清理申请痕迹
   */
  async removeRecord(options: RemoveRecordOptions<TechnitiumRecord>): Promise<void> {
    const { fullRecord, value, domain } = options.recordReq;
    const record = options.recordRes;
    this.logger.info('删除域名解析：', domain, fullRecord, value, record);

    // 构建API URL
    const apiUrl = `${this.access.apiUrl}/api/zones/records/delete`;
    
    // 构建查询参数
    const params = new URLSearchParams({
      domain: fullRecord,
      type: 'TXT',
      text: value,
    });

    // 调用Technitium API删除TXT记录
    await this.access.doRequest({ url: apiUrl, method: 'post', params: params });

    this.logger.info('删除域名解析成功:', fullRecord, value);
  }
}

// 实例化这个provider，将其自动注册到系统中
new TechnitiumDnsProvider();
