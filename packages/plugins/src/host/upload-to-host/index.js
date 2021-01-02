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
          label: '证书路径'
        },
        keyPath: {
          label: '私钥路径'
        },
        accessProvider: {
          label: '主机登录配置',
          type: [String, Object],
          desc: 'AccessProviders的key 或 一个包含用户名密码的对象',
          options: 'accessProviders[type=ssh]'
        }
      },
      output: {
        hostCrtPath: {
          type: String,
          desc: '上传成功后的证书路径'
        },
        hostKeyPath: {
          type: String,
          desc: '上传成功后的私钥路径'
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
