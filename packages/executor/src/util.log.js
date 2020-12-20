import log4js from 'log4js'
log4js.configure({
  appenders: { std: { type: 'stdout' } },
  categories: { default: { appenders: ['std'], level: 'info' } }
})
const logger = log4js.getLogger('certd')
export default logger

// import debug from 'debug'
// debug.enable('info,debug,error,warn')
// export default {
//   debug: debug('debug'),
//   info: debug('info'),
//   error: debug('error'),
//   warn: debug('warn')
// }
