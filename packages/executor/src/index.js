import { Certd } from '@certd/certd'
import DefaultPlugins from '@certd/plugins'
import logger from './util.log.js'
import _ from 'lodash'
export class Executor {
  constructor (args = {}) {
    this.certd = new Certd()
    const { plugins } = args
    this.initPlugins(plugins)
  }

  use (plugin) {
    if (plugin == null) {
      return
    }
    this.plugins[plugin.name] = plugin
    if (plugin.define) {
      const define = plugin.define()
      this.plugins[define.name] = plugin
    }
  }

  initPlugins (customPlugins) {
    this.plugins = {}
    for (const key in DefaultPlugins) {
      this.use(DefaultPlugins[key])
    }
    if (customPlugins) {
      for (const plugin of customPlugins) {
        this.use(plugin)
      }
    }
  }

  async run (options, args) {
    if (args != null) {
      _.merge(options.args, args)
    }
    logger.info('任务开始')
    const cert = await this.runCertd(options)
    if (cert == null) {
      throw new Error('申请证书失败')
    }
    logger.info('证书保存路径:', cert.certDir)
    if (!cert.isNew) {
      // 如果没有更新
      if (!options.args.forceDeploy) {
        // 且不需要强制运行deploy
        logger.info('证书无更新，无需重新部署')
        logger.info('任务完成')
        return { cert }
      }
    }

    const context = {}
    await this.runDeploys({ options, cert, context })
    logger.info('任务完成')
    return {
      cert,
      context
    }
  }

  async runCertd (options) {
    logger.info(`申请证书${JSON.stringify(options.cert.domains)}开始`)
    const cert = await this.certd.certApply(options)
    logger.info(`申请证书${JSON.stringify(options.cert.domains)}完成`)
    return cert
  }

  async runDeploys ({ options, cert, context }) {
    if (cert == null) {
      cert = this.certd.readCurrentCert(options.cert.email, options.cert.domains)
    }
    for (const deploy of options.deploy) {
      logger.info(`--部署任务【${deploy.name}】开始`)
      if (deploy.disabled === true) {
        logger.info('----此任务已被禁用，跳过')
        break
      }
      for (const task of deploy.tasks) {
        await this.runTask({ options, cert, task, context })
      }
      logger.info(`--部署任务【${deploy.name}】完成`)
    }
  }

  async runTask ({ options, task, cert, context }) {
    const taskType = task.type
    const Plugin = this.plugins[taskType]
    if (Plugin == null) {
      throw new Error(`----插件：${taskType}还未安装`)
    }

    logger.info(`----任务【${task.name}】开始执行`)
    let instance = Plugin
    if (Plugin instanceof Function) {
      instance = new Plugin()
    }
    await instance.execute({ cert, accessProviders: options.accessProviders, args: task, context })
    logger.info(`----任务【${task.name}】执行完成`)
  }
}
