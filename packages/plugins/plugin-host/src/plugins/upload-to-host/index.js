import { AbstractHostPlugin } from '../abstract-host.js'
import { SshClient } from '../ssh.js'
export class UploadCertToHost extends AbstractHostPlugin {
  /**
   * 插件定义
   * 名称
   * 入参
   * 出参
   */
  static define () {
    return {
      name: 'uploadCertToHost',
      label: '上传证书到主机',
      input: {
        crtPath: {
          title: '证书保存路径'
        },
        keyPath: {
          title: '私钥保存路径'
        },
        accessProvider: {
          title: '主机登录配置',
          helper: 'access授权',
          component: {
            name: 'access-provider-selector',
            filter: 'ssh'
          },
          rules: [{ required: true, message: '此项必填' }]
        },
        sudo: {
          title: '是否sudo',
          component: {
            name: 'a-checkbox',
            vModel: 'checked'
          }
        }
      },
      output: {
        hostCrtPath: {
          helper: '上传成功后的证书路径'
        },
        hostKeyPath: {
          helper: '上传成功后的私钥路径'
        }
      }
    }
  }

  async execute ({ cert, props, context }) {
    const { crtPath, keyPath, accessProvider } = props
    const connectConf = this.getAccessProvider(accessProvider)
    const sshClient = new SshClient()
    await sshClient.uploadFiles({
      connectConf,
      transports: [
        {
          localPath: cert.crtPath,
          remotePath: crtPath
        },
        {
          localPath: cert.keyPath,
          remotePath: keyPath
        }
      ]
    })
    this.logger.info('证书上传成功：crtPath=', crtPath, ',keyPath=', keyPath)

    context.hostCrtPath = crtPath
    context.hostKeyPath = keyPath
    return {
      hostCrtPath: crtPath,
      hostKeyPath: keyPath
    }
  }

  /**
   * @param cert
   * @param props
   * @param context
   * @returns {Promise<void>}
   */
  async rollback ({ cert, props, context }) {

  }
}
