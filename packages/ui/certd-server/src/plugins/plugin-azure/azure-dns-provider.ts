import { AbstractDnsProvider, CreateRecordOptions, DomainRecord, IsDnsProvider, RemoveRecordOptions } from '@certd/plugin-cert';
import { AzureAccess } from './access.js';
import { PageRes, PageSearch } from '@certd/pipeline';

@IsDnsProvider({
  name: 'azure-dns',
  title: 'Azure DNS',
  desc: 'Azure DNS 解析提供商',
  accessType: 'azure',
  icon: 'simple-icons:microsoftazure',
  order: 1,
})
export class AzureDnsProvider extends AbstractDnsProvider {
  access: AzureAccess;
  
  async onInstance() {
    this.access = this.ctx.access as AzureAccess;
  }

  async createRecord(options: CreateRecordOptions): Promise<any> {
    const { fullRecord, value, type, domain } = options;
    this.logger.info('添加域名解析：', fullRecord, value, type, domain);

    const zone = await this.access.getZoneId(domain);
    this.logger.info(`获取到 DNS 区域: ${zone.name}, ID: ${zone.id}`);
    
    const relativeRecordSetName = fullRecord.replace(`.${zone.name}`, '').replace(`.${zone.name.replace(/\.$/, '')}`, '');
    
    await this.access.createOrUpdateRecordSet(zone.name, type, relativeRecordSetName, value);
    
    return {
      zoneId: zone.id,
      zoneName: zone.name,
      recordType: type,
      relativeRecordSetName,
      value: value,
    };
  }

  async removeRecord(options: RemoveRecordOptions<any>): Promise<void> {
    const { fullRecord, value: reqValue, type } = options.recordReq;
    const record = options.recordRes;
    
    if (!record) {
      this.logger.warn('记录信息为空，不执行删除');
      return;
    }

    try {
      const value = record.value || reqValue;
      await this.access.deleteRecordSet(record.zoneName, record.recordType, record.relativeRecordSetName, value);
      this.logger.info(`删除域名解析成功：${fullRecord} ${value} ${type}`);
    } catch (e: any) {
      this.logger.warn(`删除域名解析失败：${e.message}`, );
    }
  }

  async getDomainListPage(req: PageSearch): Promise<PageRes<DomainRecord>> {
    return await this.access.listZonesPage(req);
  }
}

new AzureDnsProvider();
