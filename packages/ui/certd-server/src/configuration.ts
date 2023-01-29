import * as validateComp from '@midwayjs/validate';
import * as productionConfig from './config/config.production';
import * as previewConfig from './config/config.preview';
import * as defaultConfig from './config/config.default';
import { Configuration, App } from '@midwayjs/decorator';
import * as koa from '@midwayjs/koa';
import * as orm from '@midwayjs/typeorm';
import * as cache from '@midwayjs/cache';
import cors from '@koa/cors';
import { join } from 'path';
import * as flyway from 'midway-flyway-js';
import { ReportMiddleware } from './middleware/report';
import { GlobalExceptionMiddleware } from './middleware/global-exception';
import { PreviewMiddleware } from './middleware/preview';
import { AuthorityMiddleware } from './middleware/authority';
import * as pipeline from './plugins/pipeline';
import * as cron from './plugins/cron';
@Configuration({
  imports: [koa, orm, cache, flyway, validateComp,pipeline, cron],
  importConfigs: [
    {
      default: defaultConfig,
      preview: previewConfig,
      production: productionConfig,
    },
  ],
})
export class ContainerConfiguration {}
@Configuration({
  conflictCheck: true,
  importConfigs: [join(__dirname, './config')],
})
export class ContainerLifeCycle {
  @App()
  app: koa.Application;

  async onReady() {
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
      ReportMiddleware,
      //统一异常处理
      GlobalExceptionMiddleware,
      //预览模式限制修改id<1000的数据
      PreviewMiddleware,
      //授权处理
      AuthorityMiddleware,
    ]);

    //加载插件
  }
}
