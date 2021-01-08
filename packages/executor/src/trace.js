import { util } from '@certd/api'
import _ from 'lodash-es'
const logger = util.logger
export class Trace {
  constructor (context) {
    this.context = context
  }

  set ({ deployName, taskName, prop, value }) {
    const key = this.buildTraceKey({ deployName, taskName, prop })
    const oldValue = _.get(this.context, key) || {}
    _.merge(oldValue, value)
    _.set(this.context, key, oldValue)
  }

  get ({ deployName, taskName, prop }) {
    return _.get(this.context, this.buildTraceKey({ deployName, taskName, prop }))
  }

  buildTraceKey ({ deployName, taskName, prop }) {
    let key = '__trace__'
    if (deployName) {
      key += '.'
      key += deployName.replace(/\./g, '_')
    }
    if (taskName) {
      key += '.tasks.'
      key += taskName.replace(/\./g, '_')
    }
    if (prop) {
      key += '.' + prop
    }
    return key
  }

  getStringLength (str) {
    const enLength = str.replace(/[\u0391-\uFFE5]/g, '').length // 先把中文替换成两个字节的英文，再计算长度
    return Math.floor((str.length - enLength) * 1.5) + enLength
  }

  print () {
    const context = this.context
    logger.info('---------------------------任务结果总览--------------------------')
    if (context.certIsNew) {
      this.printTraceLine({ current: 'success', remark: '证书更新成功' }, '更新证书')
    } else {
      this.printTraceLine({ current: 'skip', remark: '还未到过期时间，跳过' }, '更新证书')
    }
    const trace = this.get({ })
    // logger.info('trace', trace)
    for (const deployName in trace) {
      if (trace[deployName] == null) {
        trace[deployName] = {}
      }
      const traceStatus = this.printTraceLine(trace[deployName], deployName)

      const tasks = traceStatus.tasks
      if (tasks) {
        for (const taskName in tasks) {
          if (tasks[taskName] == null) {
            tasks[taskName] = {}
          }
          this.printTraceLine(tasks[taskName], taskName, '   └')
        }
      }
    }

    const mainContext = {}
    _.merge(mainContext, context)
    delete mainContext.__trace__
    logger.info('context:', JSON.stringify(mainContext))
  }

  printTraceLine (traceStatus, name, prefix = '') {
    const length = this.getStringLength(name)
    const endPad = _.repeat('-', 45 - prefix.length - length) + '\t'
    const status = traceStatus.current || traceStatus.status || ''
    const remark = traceStatus.remark || ''
    logger.info(`${prefix}【${name}】${endPad}[${status}]  \t${remark}`)
    return traceStatus
  }
}
