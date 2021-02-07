import _ from 'lodash-es'
import { accessProviderRegistry } from '@certd/api'

import { AliyunAccessProvider } from './providers/aliyun.js'
import { DnspodAccessProvider } from './providers/dnspod.js'
import { TencentAccessProvider } from './providers/tencent.js'
import { SSHAccessProvider } from './providers/ssh.js'

export const DefaultAccessProviders = {
  AliyunAccessProvider,
  DnspodAccessProvider,
  TencentAccessProvider,
  SSHAccessProvider
}
export default {
  install () {
    _.forEach(DefaultAccessProviders, item => {
      accessProviderRegistry.install(item)
    })
  }
}
