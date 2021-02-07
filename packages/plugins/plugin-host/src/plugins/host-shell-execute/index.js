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
      label: '执行远程主机脚本命令',
      input: {
        script: {
          label: 'shell脚本命令',
          component: {
            name: 'a-textarea'
          }
        },
        accessProvider: {
          label: '主机登录配置',
          type: [String, Object],
          desc: '登录',
          component: {
            name: 'access-provider-selector',
            filter: 'ssh'
          },
          required: true
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
    const ret = await sshClient.shell({
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
