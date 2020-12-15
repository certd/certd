import Certd from '@certd/certd'
import CertdPlugins from '@certd/plugins'
import options from './options'
import log from './util.log'
export class DeployFlow {
  async run () {
    const certd = new Certd()
    const cert = certd.certApply(options)
    for (const deploy of options.deploy) {
      log.info(`-------部署任务【${deploy.deployName}】开始-------`)

      for (const task of deploy.tasks) {
        await this.runTask({ options, cert, task })
      }
      log.info(`-------部署任务【${deploy.deployName}】完成-------`)
    }
  }

  async runTask ({ options, task, cert }) {
    const taskType = task.type
    const plugin = CertdPlugins[taskType]
    if (plugin == null) {
      throw new Error(`插件：${taskType}还未安装`)
    }
    const context = {}
    log.info(`--插件【${task.taskName}】开始执行-------`)
    await plugin.execute({ cert, providers: options.providers, args: task, context })
    log.info(`--插件【${task.taskName}】执行完成-------`)
  }
}
