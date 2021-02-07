import { Certd } from '@certd/certd'
import { pluginRegistry, util } from '@certd/api'
import _ from 'lodash-es'
import dayjs from 'dayjs'
import { Trace } from './trace.js'
import DefaultPlugins from '@certd/plugins'

const logger = util.logger

// 安装默认插件和授权提供者
DefaultPlugins.install()

function createDefaultOptions () {
  return {
    args: {
      forceCert: false,
      forceDeploy: true,
      forceRedeploy: false,
      doNotThrowError: false // 部署流程执行有错误时，不抛异常，此时整个任务执行完毕后，可以返回结果，你可以在返回结果中处理
    }
  }
}
export class Executor {
  constructor () {
    this.trace = new Trace()
  }

  async run (options) {
    logger.info('------------------- Cert-D ---------------------')
    try {
      this.transferToSafetyOptions(options)
      options = _.merge(createDefaultOptions(), options)
      return await this.doRun(options)
    } catch (e) {
      logger.error('任务执行出错：' + e.message, e)
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
      if (!options.args.forceDeploy && !options.args.forceRedeploy) {
        // 且不需要强制运行deploy
        logger.info('证书无更新，无需重新部署')
        logger.info('任务完成')
        return { cert }
      }
    }
    // 读取上次执行进度
    let context = {}
    const contextJson = await certd.certStore.getCurrentFile('context.json')
    if (contextJson) {
      context = JSON.parse(contextJson)
    }

    context.certIsNew = !!cert.isNew

    const trace = new Trace(context)
    const resultTrace = trace.getInstance({ type: 'result' })
    // 运行部署任务
    try {
      await this.runDeploys({ options, cert, context, trace })
    } finally {
      await certd.certStore.setCurrentFile('context.json', JSON.stringify(context))
    }
    logger.info('任务完成')
    trace.print()
    const result = resultTrace.get({ })
    const returnData = {
      cert,
      context,
      result
    }
    if (result.status === 'error' && options.args.doNotThrowError === false) {
      throw new Error(result.remark)
    }
    return returnData
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

      const deployTrace = trace.getInstance({ type: 'deploy', deployName })
      if (deploy.disabled === true) {
        logger.info('此流程已被禁用，跳过')
        logger.info('')
        deployTrace.set({ value: { current: 'skip', status: 'disabled', remark: '流程禁用' } })
        continue
      }
      try {
        for (const task of deploy.tasks) {
          if (context[deployName] == null) {
            context[deployName] = {}
          }
          const taskContext = context[deployName]
          // 开始执行任务列表
          await this.runTask({ options, cert, task, context: taskContext, deploy, trace })
        }

        deployTrace.set({ value: { status: 'success', remark: '执行成功' } })
        trace.set({ type: 'result', value: { status: 'success', remark: '执行成功' } })
      } catch (e) {
        deployTrace.set({ value: { status: 'error', remark: '执行失败：' + e.message } })
        trace.set({ type: 'result', value: { status: 'error', remark: deployName + '执行失败：' + e.message } })
        logger.error('流程执行失败', e)
      }

      logger.info('')
    }
  }

  async runTask ({ options, task, cert, context, deploy, trace }) {
    const taskType = task.type
    const Plugin = pluginRegistry.get(taskType)
    const deployName = deploy.deployName
    const taskName = task.taskName
    if (Plugin == null) {
      throw new Error(`插件：${taskType}还未安装`)
    }

    let instance = Plugin
    if (Plugin instanceof Function) {
      instance = new Plugin({ accessProviders: options.accessProviders })
    }
    const taskTrace = trace.getInstance({ type: 'deploy', deployName, taskName })
    const traceStatus = taskTrace.get({})
    if (traceStatus && traceStatus.status === 'success' && !options.args.forceRedeploy) {
      logger.info(`----【${taskName}】已经执行完成，跳过此任务`)
      taskTrace.set({ value: { current: 'skip', status: 'success', remark: '已执行成功过，本次跳过' } })
      return
    }
    logger.info(`----【${taskName}】开始执行`)
    try {
      // 执行任务
      await instance.execute({ cert, props: task.props, context })
      taskTrace.set({ value: { current: 'success', status: 'success', remark: '执行成功', time: dayjs().format() } })
    } catch (e) {
      taskTrace.set({ value: { current: 'error', status: 'error', remark: e.message, time: dayjs().format() } })
      throw e
    }
    logger.info(`----任务【${taskName}】执行完成`)
    logger.info('')
  }
}
