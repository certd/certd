import util from './util.js'
import log4js from 'log4js'
import path from 'path'
const level = process.env.NODE_ENV === 'development' ? 'debug' : 'info'
const filename = path.join(util.getUserBasePath(), '/logs/certd.log')
log4js.configure({
  appenders: { std: { type: 'stdout' }, file: { type: 'file', pattern: 'yyyy-MM-dd', daysToKeep: 3, filename } },
  categories: { default: { appenders: ['std'], level: level } }
})
const logger = log4js.getLogger('certd')
export default logger
