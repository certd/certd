
import _ from 'lodash-es'

import { AliyunDnsProvider, AliyunAccessProvider } from './access-providers/aliyun'

import { UploadCertToAliyun } from './plugins/upload-to-aliyun'
import { DeployCertToAliyunCDN } from './plugins/deploy-to-cdn'

import { UploadCertToTencent } from './tencent/upload-to-tencent/index.js'

import { DeployCertToTencentCDN } from './tencent/deploy-to-cdn/index.js'

import { DeployCertToTencentCLB } from './tencent/deploy-to-clb/index.js'

import { DeployCertToTencentTKEIngress } from './tencent/deploy-to-tke-ingress/index.js'

import { UploadCertToHost } from './host/upload-to-host/index.js'
import { HostShellExecute } from './host/host-shell-execute/index.js'

import { pluginRegistry, accessProviderRegister, dnsProviderRegistry } from '@certd/api'

export const Plugins = {
  UploadCertToAliyun,
  DeployCertToAliyunCDN,
  UploadCertToTencent,
  DeployCertToTencentTKEIngress,
  DeployCertToTencentCDN,
  DeployCertToTencentCLB,
  UploadCertToHost,
  HostShellExecute
}
export default {
  install () {
    _.forEach(Plugins, item => {
      pluginRegistry.install(item)
    })

    accessProviderRegister.install(AliyunAccessProvider)

    dnsProviderRegistry.install(AliyunDnsProvider)
  }
}
