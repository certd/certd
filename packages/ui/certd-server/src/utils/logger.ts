import log4js from 'log4js';
import path from 'path';
const level = process.env.NODE_ENV === 'development' ? 'debug' : 'info';
const filename = path.join('/logs/server.log');
log4js.configure({
  appenders: {
    std: { type: 'stdout', level: 'debug' },
    file: { type: 'file', pattern: 'yyyy-MM-dd', daysToKeep: 3, filename },
  },
  categories: { default: { appenders: ['std'], level } },
});
export const logger = log4js.getLogger('fast');
