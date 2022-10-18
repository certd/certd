import _ from 'lodash'

import { TencentAccessProvider } from './access-providers/tencent.js'
import { DnspodAccessProvider } from './access-providers/dnspod.js'
import { DnspodDnsProvider } from './dns-providers/dnspod.js'

import { UploadCertToTencent } from './plugins/upload-to-tencent/index.js'

import { DeployCertToTencentCDN } from './plugins/deploy-to-cdn/index.js'

import { DeployCertToTencentCLB } from './plugins/deploy-to-clb/index.js'

import { DeployCertToTencentTKEIngress } from './plugins/deploy-to-tke-ingress/index.js'

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
    accessProviderRegistry.install(DnspodAccessProvider)

    dnsProviderRegistry.install(DnspodDnsProvider)
  }
}
