import _ from 'lodash-es'
import { AliyunDnsProvider } from './providers/aliyun.js'
import { DnspodDnsProvider } from './providers/dnspod.js'
import { dnsProviderRegistry } from '@certd/api'

export const DefaultDnsProviders = {
  AliyunDnsProvider,
  DnspodDnsProvider
}
export default {
  install () {
    _.forEach(DefaultDnsProviders, item => {
      dnsProviderRegistry.install(item)
    })
  }
}
