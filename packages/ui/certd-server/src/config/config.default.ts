import { MidwayConfig } from '@midwayjs/core';
// import { join } from 'path';
// import { dirname } from 'node:path';
// import { fileURLToPath } from 'node:url';
// // const __filename = fileURLToPath(import.meta.url);
// const __dirname = dirname(fileURLToPath(import.meta.url));

// eslint-disable-next-line node/no-extraneous-import
import { FlywayHistory } from '@certd/midway-flyway-js';
import { UserEntity } from '../modules/authority/entity/user.js';
import { PipelineEntity } from '../modules/pipeline/entity/pipeline.js';
//import { logger } from '../utils/logger';
// load .env file in process.cwd
import { mergeConfig } from './loader.js';
import { Keys } from './keys.js';

const env = process.env.NODE_ENV || 'development';

const keys = Keys.load();
const development = {
  keys: keys.cookieKeys,
  koa: {
    port: 7001,
  },
  staticFile: {
    usePrecompiledGzip: true,
    buffer: true,
    maxAge: 30 * 24 * 60 * 60 * 1000,
    gzip: true,
    dirs: {
      default: {
        prefix: '/',
        dir: 'public',
        alias: {
          '/': '/index.html',
        },
      },
    },
  },
  cron: {
    //启动时立即触发一次
    immediateTriggerOnce: false,
    //启动时仅注册admin（id=1）用户的
    onlyAdminUser: false,
  },
  /**
   * 演示环境
   */
  preview: {
    enabled: false,
  },

  /**
   *  数据库
   */
  typeorm: {
    dataSource: {
      default: {
        /**
         * 单数据库实例
         */
        type: 'better-sqlite3',
        database: './data/db.sqlite',
        synchronize: false, // 如果第一次使用，不存在表，有同步的需求可以写 true
        logging: false,

        // 配置实体模型 或者 entities: '/entity',
        entities: ['**/modules/*/entity/*.ts', '**/entity/*.js', '**/entity/*.d.ts', PipelineEntity, FlywayHistory, UserEntity],
      },
    },
  },
  /**
   * 自动升级数据库脚本
   */
  flyway: {
    scriptDir: './db/migration',
  },

  auth: {
    jwt: {
      secret: keys.jwtKey,
      expire: 7 * 24 * 60 * 60, //单位秒
    },
  },
  certd: {
    fileRootDir: './data/files',
  },
  system: {
    resetAdminPasswd: false,
  },
  plus: {
    serverBaseUrl: 'http://127.0.0.1:11007',
  },
} as MidwayConfig;
mergeConfig(development, 'development');

mergeConfig(development, env);

export default development;
