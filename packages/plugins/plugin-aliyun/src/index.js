import _ from 'lodash'

import { AliyunDnsProvider } from './dns-providers/aliyun.js'
import { AliyunAccessProvider } from './access-providers/aliyun.js'
import { UploadCertToAliyun } from './plugins/upload-to-aliyun/index.js'
import { DeployCertToAliyunCDN } from './plugins/deploy-to-cdn/index.js'
import { DeployCertToAliyunAckIngress } from './plugins/deploy-to-ack-ingress/index.js'

import { pluginRegistry, accessProviderRegistry, dnsProviderRegistry } from '@certd/api'

export const Plugins = {
  UploadCertToAliyun,
  DeployCertToAliyunCDN,
  DeployCertToAliyunAckIngress
}
export default {
  install () {
    _.forEach(Plugins, item => {
      pluginRegistry.install(item)
    })

    accessProviderRegistry.install(AliyunAccessProvider)
    dnsProviderRegistry.install(AliyunDnsProvider)
  }
}
