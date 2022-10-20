import { AbstractHostPlugin } from '../abstract-host.js'
import { SshClient } from '../ssh.js'
export class HostShellExecute extends AbstractHostPlugin {
  /**
   * 插件定义
   * 名称
   * 入参
   * 出参
   */
  static define () {
    return {
      name: 'hostShellExecute',
      title: '执行远程主机脚本命令',
      input: {
        accessProvider: {
          title: '主机登录配置',
          helper: '登录',
          component: {
            name: 'access-selector',
            type: 'ssh'
          },
          required: true
        },
        script: {
          title: 'shell脚本命令',
          component: {
            name: 'a-textarea'
          }
        }
      },
      output: {

      }
    }
  }

  async execute ({ cert, props, context }) {
    const { script, accessProvider } = props
    const connectConf = this.getAccessProvider(accessProvider)
    const sshClient = new SshClient()
    const ret = await sshClient.exec({
      connectConf,
      script
    })
    return ret
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
