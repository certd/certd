import _ from 'lodash-es'
import { AliyunAccessProvider } from './providers/aliyun.js'
import { DnspodAccessProvider } from './providers/dnspod.js'
import { TencentAccessProvider } from './providers/tencent.js'
import { accessProviderRegistry } from '@certd/api'

export const DefaultAccessProviders = {
  AliyunAccessProvider,
  DnspodAccessProvider,
  TencentAccessProvider,
}
export default {
  install () {
    _.forEach(DefaultAccessProviders, item => {
      accessProviderRegistry.install(item)
    })
  }
}
