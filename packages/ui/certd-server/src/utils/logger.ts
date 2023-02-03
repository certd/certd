const log4js = require('log4js');
const level = process.env.NODE_ENV === 'development' ? 'debug' : 'info';
const path = require('path');
const filename = path.join('/logs/server.log');
log4js.configure({
  appenders: {
    std: { type: 'stdout', level: 'debug' },
    file: { type: 'file', pattern: 'yyyy-MM-dd', daysToKeep: 3, filename },
  },
  categories: { default: { appenders: ['std'], level } },
});
export const logger = log4js.getLogger('fast');
