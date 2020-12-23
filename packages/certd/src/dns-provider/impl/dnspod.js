import { DnsProvider } from '../dns-provider.js'
import _ from 'lodash'
import log from '../../utils/util.log.js'
import { request } from '../../utils/util.request.js'
export default class DnspodDnsProvider extends DnsProvider {
  constructor (dnsProviderConfig) {
    super()
    if (!dnsProviderConfig.id || !dnsProviderConfig.token) {
      throw new Error('请正确配置dnspod的 id 和 token')
    }
    this.loginToken = dnsProviderConfig.id + ',' + dnsProviderConfig.token
  }

  async doRequest (options) {
    const config = {
      method: 'post',
      formData: {
        login_token: this.loginToken,
        format: 'json',
        lang: 'cn',
        error_on_empty: 'no'
      },
      timeout: 5000
    }
    _.merge(config, options)

    const ret = await request(config)
    if (ret?.status?.code !== '1') {
      throw new Error('请求失败：' + ret.status.message + ',api=' + config.url)
    }
    return ret
  }

  async getDomainList () {
    const ret = await this.doRequest({
      url: 'https://dnsapi.cn/Domain.List'
    })
    log.debug('dnspod 域名列表：', ret.domains)
    return ret.domains
  }

  async createRecord ({ fullRecord, type, value }) {
    log.info('添加域名解析：', fullRecord, value)
    const domainItem = await this.matchDomain(fullRecord, 'name')
    const domain = domainItem.name
    const rr = fullRecord.replace('.' + domain, '')

    const ret = await this.doRequest({
      url: 'https://dnsapi.cn/Record.Create',
      formData: {
        domain,
        sub_domain: rr,
        record_type: type,
        record_line: '默认',
        value: value,
        mx: 1
      }
    })
    console.log('添加域名解析成功:', fullRecord, value, JSON.stringify(ret.record))
    return ret.record
  }

  async removeRecord ({ fullRecord, type, value, record }) {
    const domain = await this.matchDomain(fullRecord, 'name')

    const ret = await this.doRequest({
      url: 'https://dnsapi.cn/Record.Remove',
      formData: {
        domain,
        record_id: record.id
      }
    })
    log.info('删除域名解析成功:', fullRecord, value)
    return ret.RecordId
  }
}
