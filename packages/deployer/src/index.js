import Certd from '@certd/certd'
import CertdPlugins from '@certd/plugins'
import log from './util.log.js'
export class Deployer {
  async run (options) {
    const certd = new Certd()
    const cert = certd.certApply(options)
    const context = {}
    for (const deploy of options.deploy) {
      log.info(`-------部署任务【${deploy.deployName}】开始-------`)

      for (const task of deploy.tasks) {
        await this.runTask({ options, cert, task, context })
      }
      log.info(`-------部署任务【${deploy.deployName}】完成-------`)
    }
    return {
      cert,
      context
    }
  }

  async runTask ({ options, task, cert, context }) {
    const taskType = task.type
    const plugin = CertdPlugins[taskType]
    if (plugin == null) {
      throw new Error(`插件：${taskType}还未安装`)
    }

    log.info(`--插件【${task.taskName}】开始执行-------`)
    await plugin.execute({ cert, accessProviders: options.accessProviders, args: task, context })
    log.info(`--插件【${task.taskName}】执行完成-------`)
  }
}
