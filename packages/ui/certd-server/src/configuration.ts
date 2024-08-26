import { App, Configuration } from '@midwayjs/core';
import * as koa from '@midwayjs/koa';
import * as orm from '@midwayjs/typeorm';
import * as cache from '@midwayjs/cache';
import * as validate from '@midwayjs/validate';
import * as info from '@midwayjs/info';
import * as staticFile from '@midwayjs/static-file';
import * as cron from './modules/plugin/cron/index.js';
import * as flyway from '@certd/midway-flyway-js';
import cors from '@koa/cors';
import { GlobalExceptionMiddleware } from './middleware/global-exception.js';
import { PreviewMiddleware } from './middleware/preview.js';
import { AuthorityMiddleware } from './middleware/authority.js';
import { logger } from './utils/logger.js';
import { ResetPasswdMiddleware } from './middleware/reset-passwd/middleware.js';
import DefaultConfig from './config/config.default.js';

process.on('uncaughtException', error => {
  console.error('未捕获的异常：', error);
  // 在这里可以添加日志记录、发送错误通知等操作
});

@Configuration({
  imports: [
    koa,
    orm,
    cache,
    flyway,
    cron,
    staticFile,
    validate,
    {
      component: info,
      enabledEnvironment: ['local'],
    },
  ],
  importConfigs: [
    {
      default: DefaultConfig,
    },
  ],
})
export class MainConfiguration {
  @App('koa')
  app: koa.Application;

  async onReady() {
    // add middleware
    // this.app.useMiddleware([ReportMiddleware]);
    // add filter
    // this.app.useFilter([NotFoundFilter, DefaultErrorFilter]);
    //跨域
    this.app.use(
      cors({
        origin: '*',
      })
    );
    // bodyparser options see https://github.com/koajs/bodyparser
    //this.app.use(bodyParser());
    //请求日志打印
    this.app.useMiddleware([
      //统一异常处理
      GlobalExceptionMiddleware,
      //预览模式限制修改id<1000的数据
      PreviewMiddleware,
      //授权处理
      AuthorityMiddleware,

      //resetPasswd,重置密码模式下不提供服务
      ResetPasswdMiddleware,
    ]);

    logger.info('当前环境：', this.app.getEnv()); // prod
  }
}
