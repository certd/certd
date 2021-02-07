import _ from 'lodash-es'

import { SSHAccessProvider } from './access-providers/ssh'

import { UploadCertToHost } from './host/upload-to-host/index.js'
import { HostShellExecute } from './host/host-shell-execute/index.js'

import { pluginRegistry, accessProviderRegistry } from '@certd/api'

export const DefaultPlugins = {
  UploadCertToHost,
  HostShellExecute
}
export default {
  install () {
    _.forEach(DefaultPlugins, item => {
      pluginRegistry.install(item)
    })

    accessProviderRegistry.install(SSHAccessProvider)
  }
}
