import { Certd } from '@certd/certd'
import DefaultPlugins from '@certd/plugins'
import logger from './util.log.js'
import _ from 'lodash'
import dayjs from 'dayjs'
export class Executor {
  constructor (args = {}) {
    const { plugins } = args
    this.plugins = {}
    this.usePlugins(DefaultPlugins)
    this.usePlugins(plugins)
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

  usePlugins (plugins) {
    if (plugins) {
      for (const plugin of plugins) {
        this.use(plugin)
      }
    }
  }

  async run (options, args) {
    try {
      return await this.doRun(options, args)
    } catch (e) {
      logger.error('任务执行出错：', e)
      throw e
    }
  }

  async doRun (options, args) {
    if (args != null) {
      _.merge(options.args, args)
    }
    logger.info('任务开始')
    const certd = new Certd(options)
    const cert = await this.runCertd(certd)
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

    let context = {}
    const contextJson = await certd.certStore.getCurrentFile('context.json')
    if (contextJson) {
      context = JSON.parse(contextJson)
    }
    try {
      await this.runDeploys({ options, cert, context })
    } finally {
      await certd.certStore.setCurrentFile('context.json', JSON.stringify(context))
    }

    logger.info('任务完成')
    return {
      cert,
      context
    }
  }

  async runCertd (certd) {
    logger.info(`申请证书${JSON.stringify(certd.options.cert.domains)}开始`)
    const cert = await certd.certApply()
    logger.info(`申请证书${JSON.stringify(certd.options.cert.domains)}完成`)
    return cert
  }

  async runDeploys ({ options, cert, context }) {
    if (cert == null) {
      const certd = new Certd(options)
      cert = await certd.readCurrentCert()
    }
    for (const deploy of options.deploy) {
      logger.info(`--部署任务【${deploy.deployName}】开始`)
      if (deploy.disabled === true) {
        logger.info('----此部署任务已被禁用，跳过')
        continue
      }
      for (const task of deploy.tasks) {
        await this.runTask({ options, cert, task, context })
      }
      logger.info(`--部署任务【${deploy.deployName}】完成`)
    }
  }

  async runTask ({ options, task, cert, context }) {
    const taskType = task.type
    const Plugin = this.plugins[taskType]
    if (Plugin == null) {
      throw new Error(`----插件：${taskType}还未安装`)
    }

    logger.info(`----任务【${task.taskName}】开始执行`)
    let instance = Plugin
    if (Plugin instanceof Function) {
      instance = new Plugin()
    }
    if (context.progress && context.progress[task.taskName] && context.progress[task.taskName].success) {
      logger.info(`----任务【${task.taskName}】已经执行完成，跳过此任务`)
      return
    }
    await instance.execute({ cert, accessProviders: options.accessProviders, props: task.props, context })
    if (context.progress == null) {
      context.progress = {}
    }
    context.progress[task.taskName] = {
      success: true,
      time: dayjs().format()
    }
    logger.info(`----任务【${task.taskName}】执行完成`)
  }
}
