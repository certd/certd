import { Init, Inject, MidwayWebRouterService, Provide, Scope, ScopeEnum } from '@midwayjs/core';
import { IMidwayKoaContext, IWebMiddleware, NextFunction } from '@midwayjs/koa';
import jwt from 'jsonwebtoken';
import { Constants } from '../basic/constants.js';
import { logger } from '../utils/logger.js';
import { AuthService } from '../modules/authority/service/auth-service.js';
import { SysSettingsService } from '../modules/system/service/sys-settings-service.js';
import { SysPrivateSettings } from '../modules/system/service/models.js';

/**
 * 权限校验
 */
@Provide()
@Scope(ScopeEnum.Singleton)
export class AuthorityMiddleware implements IWebMiddleware {
  @Inject()
  webRouterService: MidwayWebRouterService;
  @Inject()
  authService: AuthService;
  @Inject()
  sysSettingsService: SysSettingsService;

  secret: string;
  @Init()
  async init() {
    const setting: SysPrivateSettings = await this.sysSettingsService.getSetting(SysPrivateSettings);
    this.secret = setting.jwtKey;
  }

  resolve() {
    return async (ctx: IMidwayKoaContext, next: NextFunction) => {
      // 查询当前路由是否在路由表中注册
      const routeInfo = await this.webRouterService.getMatchedRouterInfo(ctx.path, ctx.method);
      if (routeInfo == null) {
        // 404
        await next();
        return;
      }
      const permission = routeInfo.summary;
      if (permission == null || permission === '') {
        ctx.status = 500;
        ctx.body = Constants.res.serverError('该路由未配置权限控制:' + ctx.path);
        return;
      }

      if (permission === Constants.per.guest) {
        await next();
        return;
      }

      let token = ctx.get('Authorization') || '';
      token = token.replace('Bearer ', '').trim();
      if (token === '') {
        //尝试从cookie中获取token
        token = ctx.cookies.get('token') || '';
      }
      if (token === '') {
        //尝试从query中获取token
        token = (ctx.query.token as string) || '';
      }
      try {
        ctx.user = jwt.verify(token, this.secret);
      } catch (err) {
        logger.error('token verify error: ', err);
        ctx.status = 401;
        ctx.body = Constants.res.auth;
        return;
      }

      if (permission !== Constants.per.authOnly) {
        const pass = await this.authService.checkPermission(ctx, permission);
        if (!pass) {
          logger.info('not permission: ', ctx.req.url);
          ctx.status = 401;
          ctx.body = Constants.res.permission;
          return;
        }
      }
      await next();
    };
  }
}
