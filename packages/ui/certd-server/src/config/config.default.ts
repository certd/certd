import { join } from 'path';
import { FlywayHistory } from 'midway-flyway-js/dist/entity';

import { MidwayConfig } from '@midwayjs/core';
import { UserEntity } from '../modules/authority/entity/user';

export default {
  // use for cookie sign key, should change to your own and keep security
  keys: 'certd666',
  koa: {
    port: 7001,
  },
  cron: {},
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
        type: 'sqlite',
        database: join(__dirname, '../../data/db.sqlite'),
        synchronize: false, // 如果第一次使用，不存在表，有同步的需求可以写 true
        logging: true,

        // 配置实体模型 或者 entities: '/entity',
        entities: [
          '**/modules/*/entity/*.ts',
          FlywayHistory,
          UserEntity,
        ],
      },
    },
  },
  /**
   * 自动升级数据库脚本
   */
  flyway: {
    scriptDir: join(__dirname, '../../db/migration'),
  },

  biz: {
    jwt: {
      secret: 'greper-is-666',
      expire: 7 * 24 * 60, //单位秒
    },
    auth: {
      ignoreUrls: ['/', '/api/login', '/api/register'],
    },
  },
} as MidwayConfig;
