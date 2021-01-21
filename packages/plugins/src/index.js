import _ from 'lodash-es'
import { UploadCertToAliyun } from './aliyun/upload-to-aliyun/index.js'
import { DeployCertToAliyunCDN } from './aliyun/deploy-to-cdn/index.js'

import { UploadCertToTencent } from './tencent/upload-to-tencent/index.js'

import { DeployCertToTencentCDN } from './tencent/deploy-to-cdn/index.js'

import { DeployCertToTencentCLB } from './tencent/deploy-to-clb/index.js'

import { DeployCertToTencentTKEIngress } from './tencent/deploy-to-tke-ingress/index.js'
import { pluginRegistry } from '@certd/api'

export const DefaultPlugins = {
  UploadCertToAliyun,
  DeployCertToAliyunCDN,
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
  }
}
