import _ from 'lodash-es'
import { AliyunDnsProvider } from './dns-provider/aliyun.js'
import { DnspodDnsProvider } from './dns-provider/dnspod.js'
import { providerRegistry } from '@certd/api'

export const DefaultProviders = {
  AliyunDnsProvider,
  DnspodDnsProvider
}
export default {
  install () {
    _.forEach(DefaultProviders, item => {
      providerRegistry.install(item)
    })
  }
}
