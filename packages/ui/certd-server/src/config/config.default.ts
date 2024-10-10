import { MidwayConfig } from '@midwayjs/core';
// import { join } from 'path';
// import { dirname } from 'node:path';
// import { fileURLToPath } from 'node:url';
// // const __filename = fileURLToPath(import.meta.url);
// const __dirname = dirname(fileURLToPath(import.meta.url));

// eslint-disable-next-line node/no-extraneous-import
import { FlywayHistory } from '@certd/midway-flyway-js';
import { UserEntity } from '../modules/sys/authority/entity/user.js';
import { PipelineEntity } from '../modules/pipeline/entity/pipeline.js';
//import { logger } from '../utils/logger';
// load .env file in process.cwd
import { mergeConfig } from './loader.js';
import { libServerEntities } from '@certd/lib-server';
import { commercialEntities } from '@certd/commercial-core';
import { tmpdir } from 'node:os';
import { uploadWhiteList, DefaultUploadFileMimeType } from '@midwayjs/upload';
import path from 'path';
const env = process.env.NODE_ENV || 'development';

const development = {
  keys: 'certd',
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
      // '/index.html': {
      //   maxAge: 0,
      // },
      // '/': {
      //   maxAge: 0,
      // },
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
        entities: ['**/modules/**/entity/*.js', ...libServerEntities, ...commercialEntities, PipelineEntity, FlywayHistory, UserEntity],
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
    serverBaseUrls: ['http://127.0.0.1:11007'],
  },
  upload: {
    // mode: UploadMode, 默认为file，即上传到服务器临时目录，可以配置为 stream
    mode: 'file',
    // fileSize: string, 最大上传文件大小，默认为 10mb
    fileSize: '10mb',
    whitelist: uploadWhiteList, //文件扩展名白名单
    mimeTypeWhiteList: DefaultUploadFileMimeType, //文件MIME类型白名单
    // whitelist: uploadWhiteList.filter(ext => ext !== '.pdf'),
    // tmpdir: string，上传的文件临时存储路径
    tmpdir: path.join(tmpdir(), 'certd-upload-files'),
    // cleanTimeout: number，上传的文件在临时目录中多久之后自动删除，默认为 5 分钟
    cleanTimeout: 5 * 60 * 1000,
    // base64: boolean，设置原始body是否是base64格式，默认为false，一般用于腾讯云的兼容
    base64: false,
    // 仅在匹配路径到 /api/upload 的时候去解析 body 中的文件信息
    match: /\/api\/basic\/file\/upload/,
  },
  agent: {
    enabled: false,
    contactText: '',
    contactLink: '',
  },
} as MidwayConfig;
mergeConfig(development, 'development');

mergeConfig(development, env);

export default development;
