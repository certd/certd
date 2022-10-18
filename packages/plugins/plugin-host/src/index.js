import _ from 'lodash'

import { SSHAccessProvider } from './access-providers/ssh.js'

import { UploadCertToHost } from './plugins/upload-to-host/index.js'
import { HostShellExecute } from './plugins/host-shell-execute/index.js'

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
