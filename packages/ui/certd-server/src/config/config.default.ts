import { MidwayConfig } from '@midwayjs/core';
// import { join } from 'path';
// import { dirname } from 'node:path';
// import { fileURLToPath } from 'node:url';
// // const __filename = fileURLToPath(import.meta.url);
// const __dirname = dirname(fileURLToPath(import.meta.url));
import { FlywayHistory, setFlywayLogger } from '@certd/midway-flyway-js';
import { UserEntity } from '../modules/sys/authority/entity/user.js';
import { PipelineEntity } from '../modules/pipeline/entity/pipeline.js';
//import { logger } from '../utils/logger';
// load .env file in process.cwd
import { loadDotEnv, mergeConfig } from './loader.js';
import { libServerEntities } from '@certd/lib-server';
import { commercialEntities } from '@certd/commercial-core';
import { tmpdir } from 'node:os';
import { DefaultUploadFileMimeType, uploadWhiteList } from '@midwayjs/upload';
import path from 'path';
import { logger } from '@certd/basic';

const env = process.env.NODE_ENV || 'development';

const development = {
  midwayLogger: {
    default: {
      dir: './logs',
    },
    // ...
  },
  keys: 'certd',
  koa: {
    hostname: "::",
    port: 7001,
  },
  https: {
    enabled: true,
    port: 7002,
    key: './data/ssl/cert.key',
    cert: './data/ssl/cert.crt',
  },
  staticFile: {
    usePrecompiledGzip: true,
    buffer: true,
    maxAge: 30 * 24 * 60 * 60,
    gzip: true,
    dirs: {
      default: {
        prefix: '/',
        dir: 'public',
        alias: {
          '/': '/index.html',
          '\\': '/index.html',
        },
        maxFiles: 200,
      },
    },
  },
  cron: {
    //启动时立即触发一次
    immediateTriggerOnce: false,
    immediateTriggerSiteMonitor: false,
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
        logging: true,
        highlightSql: false,

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
  swagger: {
    isGenerateTagForController: false,
    routerFilter: (url: string) => {
      return url.startsWith('/api/sys');
    },
    tags: [
      {
        name: 'addon',
        description: '插件管理'
      },
      {
        name: 'basic-group',
        description: '基础分组管理'
      },
      {
        name: 'basic-user',
        description: '基础用户管理'
      },
      {
        name: 'cert',
        description: '证书管理'
      },
      {
        name: 'pipeline-cname',
        description: 'CNAME配置管理'
      },
      {
        name: 'dashboard',
        description: '仪表板统计'
      },
      {
        name: 'enterprise-project',
        description: '企业项目管理'
      },
      {
        name: 'enterprise-project-member',
        description: '企业项目成员管理'
      },
      {
        name: 'mine',
        description: '个人中心'
      },
      {
        name: 'monitor',
        description: '监控管理'
      },
      {
        name: 'open',
        description: '开放API KEY管理'
      },
      {
        name: 'pipeline-access',
        description: '流水线授权配置'
      },
      {
        name: 'pipeline-cert',
        description: '流水线证书'
      },
      {
        name: 'pipeline-dns-provider',
        description: '流水线DNS提供商'
      },
      {
        name: 'pipeline-handle',
        description: '插件请求处理'
      },
      {
        name: 'pipeline-history',
        description: '流水线执行历史'
      },
      {
        name: 'pipeline-notification',
        description: '流水线通知配置'
      },
      {
        name: 'pipeline-plugin',
        description: '流水线插件'
      },
      {
        name: 'pipeline-subdomain',
        description: '流水线子域名'
      },
      {
        name: 'pipeline-template',
        description: '流水线模版'
      },
      {
        name: 'pipeline-group',
        description: '流水线分组'
      },
      {
        name: 'pipeline',
        description: '流水线管理'
      },
      {
        name: 'openapi',
        description: '开放API'
      },
    ]
  }
} as MidwayConfig;
loadDotEnv();

mergeConfig(development, 'development');

mergeConfig(development, env);

setFlywayLogger(logger);

export default development;
