import log4js from 'log4js'
log4js.configure({
  appenders: { std: { type: 'stdout' } },
  categories: { default: { appenders: ['std'], level: 'info' } }
})
const logger = log4js.getLogger('certd')
export default logger
