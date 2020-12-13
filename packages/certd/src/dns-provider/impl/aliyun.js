import { DnsProvider } from '../dns-provider.js'
import Core from '@alicloud/pop-core'
import _ from 'lodash'
import log from '../../utils/util.log.js'
export default class AliyunDnsProvider extends DnsProvider {
  constructor (dnsProviderConfig) {
    super()
    this.client = new Core({
      accessKeyId: dnsProviderConfig.accessKeyId,
      accessKeySecret: dnsProviderConfig.accessKeySecret,
      endpoint: 'https://alidns.aliyuncs.com',
      apiVersion: '2015-01-09'
    })
  }

  async getDomainList () {
    const params = {
      RegionId: 'cn-hangzhou'
    }

    const requestOption = {
      method: 'POST'
    }

    const ret = await this.client.request('DescribeDomains', params, requestOption)
    return ret.Domains.Domain
  }

  async matchDomain (dnsRecord) {
    const list = await this.getDomainList()
    let domain = null
    for (const item of list) {
      if (_.endsWith(dnsRecord, item.DomainName)) {
        domain = item.DomainName
        break
      }
    }
    if (!domain) {
      throw new Error('can not find Domain ,' + dnsRecord)
    }
    return domain
  }

  async getRecords (domain, rr, value) {
    const params = {
      RegionId: 'cn-hangzhou',
      DomainName: domain,
      RRKeyWord: rr
    }
    if (value) {
      params.ValueKeyWord = value
    }

    const requestOption = {
      method: 'POST'
    }

    const ret = await this.client.request('DescribeDomainRecords', params, requestOption)
    return ret.DomainRecords.Record
  }

  async createRecord (dnsRecord, type, recordValue) {
    const domain = await this.matchDomain(dnsRecord)
    const rr = dnsRecord.replace('.' + domain, '')

    const params = {
      RegionId: 'cn-hangzhou',
      DomainName: domain,
      RR: rr,
      Type: type,
      Value: recordValue
    }

    const requestOption = {
      method: 'POST'
    }

    try {
      const ret = await this.client.request('AddDomainRecord', params, requestOption)
      return ret.RecordId
    } catch (e) {
      // e.code === 'DomainRecordDuplicate'
      console.log('添加域名解析出错', e)
      throw e
    }
  }

  async removeRecord (dnsRecord, type, value) {
    const domain = await this.matchDomain(dnsRecord)
    const rr = dnsRecord.replace('.' + domain, '')

    const record = await this.getRecords(domain, rr, value)

    const params = {
      RegionId: 'cn-hangzhou',
      RecordId: record[0].RecordId
    }

    const requestOption = {
      method: 'POST'
    }

    const ret = await this.client.request('DeleteDomainRecord', params, requestOption)
    log.info('delete record success:', ret.RecordId)
    return ret.RecordId
  }
}
