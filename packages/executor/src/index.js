import { Certd } from '@certd/certd'
import DefaultPlugins from '@certd/plugins'
import logger from './util.log.js'
import _ from 'lodash'
import dayjs from 'dayjs'
import { Trace } from './trace.js'
export class Executor {
  constructor (args = {}) {
    const { plugins } = args
    this.plugins = {}
    this.usePlugins(DefaultPlugins)
    this.usePlugins(plugins)
    this.trace = new Trace()
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
      if (args != null) {
        _.merge(options.args, args)
      }
      return await this.doRun(options)
    } catch (e) {
      logger.error('任务执行出错：', e)
      throw e
    }
  }

  async doRun (options) {
    // 申请证书
    logger.info('任务开始')
    const certd = new Certd(options)
    const cert = await this.runCertd(certd)
    if (cert == null) {
      throw new Error('申请证书失败')
    }
    logger.info('证书保存路径:', cert.certDir)

    logger.info('----------------------')
    if (!cert.isNew) {
      // 如果没有更新
      if (!options.args?.forceDeploy && !options.args?.forceRedeploy) {
        // 且不需要强制运行deploy
        logger.info('证书无更新，无需重新部署')
        logger.info('任务完成')
        return { cert }
      }
    }
    // 读取上次执行进度
    let context = {
      certIsNew: !!cert.isNew
    }
    const contextJson = await certd.certStore.getCurrentFile('context.json')
    if (contextJson) {
      context = JSON.parse(contextJson)
    }

    const trace = new Trace(context)
    // 运行部署任务
    try {
      await this.runDeploys({ options, cert, context, trace })
    } finally {
      await certd.certStore.setCurrentFile('context.json', JSON.stringify(context))
    }

    logger.info('任务完成')
    trace.print()
    return {
      cert,
      context
    }
  }

  async runCertd (certd) {
    logger.info(`证书任务 ${JSON.stringify(certd.options.cert.domains)} 开始`)
    const cert = await certd.certApply()
    logger.info(`证书任务 ${JSON.stringify(certd.options.cert.domains)} 完成`)
    return cert
  }

  async runDeploys ({ options, cert, context, trace }) {
    if (cert == null) {
      const certd = new Certd(options)
      cert = await certd.readCurrentCert()
    }
    logger.info('部署任务开始')
    for (const deploy of options.deploy) {
      const deployName = deploy.deployName
      logger.info(`------------【${deployName}】-----------`)
      if (deploy.disabled === true) {
        logger.info('此流程已被禁用，跳过')
        logger.info('')
        trace.set({ deployName, value: { current: 'skip', status: 'disabled', remark: '流程禁用' } })
        continue
      }
      try {
        for (const task of deploy.tasks) {
          if (context[deployName] == null) {
            context[deployName] = {}
          }
          const taskContext = context[deployName]
          await this.runTask({ options, cert, task, context: taskContext, deploy, trace })
        }

        trace.set({ deployName, value: { status: 'success', remark: '执行成功' } })
      } catch (e) {
        trace.set({ deployName, value: { status: 'error', remark: '执行失败：' + e.message } })
        logger.error('流程执行失败', e)
      }

      logger.info('')
    }
  }

  async runTask ({ options, task, cert, context, deploy, trace }) {
    const taskType = task.type
    const Plugin = this.plugins[taskType]
    const deployName = deploy.deployName
    const taskName = task.taskName
    if (Plugin == null) {
      throw new Error(`插件：${taskType}还未安装`)
    }

    let instance = Plugin
    if (Plugin instanceof Function) {
      instance = new Plugin({ accessProviders: options.accessProviders })
    }
    const traceStatus = trace.get({ deployName: deploy.deployName, taskName: taskName })
    if (traceStatus?.status === 'success' && !options?.args?.forceRedeploy) {
      logger.info(`----【${taskName}】已经执行完成，跳过此任务`)
      trace.set({ deployName, taskName, value: { current: 'skip', status: 'success', remark: '已执行成功过，本次跳过' } })
      return
    }
    logger.info(`----【${taskName}】开始执行`)
    await instance.execute({ cert, props: task.props, context })
    trace.set({ deployName, taskName, value: { current: 'success', status: 'success', remark: '执行成功', time: dayjs().format() } })
    logger.info(`----任务【${taskName}】执行完成`)
    logger.info('')
  }
}
