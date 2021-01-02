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
          label: 'shell脚本命令'
        },
        accessProvider: {
          label: '主机登录配置',
          type: [String, Object],
          desc: 'AccessProviders的key 或 一个包含用户名密码的对象',
          options: 'accessProviders[type=ssh]'
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
