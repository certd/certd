import _ from 'lodash-es'

import { TencentAccessProvider } from './access-providers/tencent'
import { DnspodAccessProvider } from './access-providers/dnspod'
import { DnspodDnsProvider } from './dns-providers/dnspod.js'

import { UploadCertToTencent } from './plugins/upload-to-tencent'

import { DeployCertToTencentCDN } from './plugins/deploy-to-cdn'

import { DeployCertToTencentCLB } from './plugins/deploy-to-clb'

import { DeployCertToTencentTKEIngress } from './plugins/deploy-to-tke-ingress'

import { pluginRegistry, accessProviderRegistry, dnsProviderRegistry } from '@certd/api'

export const DefaultPlugins = {
  UploadCertToTencent,
  DeployCertToTencentTKEIngress,
  DeployCertToTencentCDN,
  DeployCertToTencentCLB
}
export default {
  install () {
    _.forEach(DefaultPlugins, item => {
      pluginRegistry.install(item)
    })

    accessProviderRegistry.install(TencentAccessProvider)
    accessProviderRegistry.install(DnspodDnsProvider)

    dnsProviderRegistry.install(DnspodDnsProvider)
  }
}
