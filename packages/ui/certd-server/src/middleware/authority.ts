import { Init, Inject, MidwayWebRouterService, Provide, Scope, ScopeEnum } from '@midwayjs/core';
import { IMidwayKoaContext, IWebMiddleware, NextFunction } from '@midwayjs/koa';
import jwt from 'jsonwebtoken';
import { Constants, SysPrivateSettings, SysSettingsService } from '@certd/lib-server';
import { logger } from '@certd/basic';
import { AuthService } from '../modules/sys/authority/service/auth-service.js';
import { OpenKeyService } from '../modules/open/service/open-key-service.js';
import { RoleService } from '../modules/sys/authority/service/role-service.js';

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
  roleService: RoleService;
  @Inject()
  openKeyService: OpenKeyService;
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
      let permission = routeInfo.description || '';
      permission = permission.trim().split(' ')[0];
      if (permission == null || permission === '') {
        ctx.status = 500;
        ctx.body = Constants.res.serverError('该路由未配置权限控制:' + ctx.path);
        return;
      }
      if (permission === Constants.per.guest) {
        await next();
        return;
      }

      const token = this.getTokenFromRequest(ctx);

      if (token) {
        try {
          ctx.user = jwt.verify(token, this.secret);
        } catch (err) {
          logger.error('token verify error: ', err);
          return this.notAuth(ctx);
        }
      } else {
        if (permission === Constants.per.guestOptionalAuth) {
          await next();
          return;
        }
        //找找openKey
        const openKey = await this.doOpenHandler(ctx);
        if (!openKey) {
          return this.notAuth(ctx);
        }
        if (permission === Constants.per.open) {
          await next();
          return;
        } else if (openKey.scope === 'open') {
          return this.notAuth(ctx, 'open key scope error，need user scope');
        }
      }

      if (permission === Constants.per.authOnly) {
        await next();
        return;
      }
      if (permission === Constants.per.guestOptionalAuth) {
        await next();
        return;
      }

      const pass = await this.authService.checkPermission(ctx, permission);
      if (!pass) {
        logger.info('not permission: ', ctx.req.url);
        ctx.status = 200;
        ctx.body = Constants.res.permission;
        return;
      }
      await next();
    };
  }

  private notAuth(ctx: IMidwayKoaContext, message?: string) {
    ctx.status = 401;
    ctx.body = Constants.res.auth;
    if (message) {
      // @ts-ignore
      ctx.body.message =message;
    }
    return;
  }

  private getTokenFromRequest(ctx: IMidwayKoaContext) {
    let token = ctx.get('Authorization') || '';
    token = token.replace('Bearer ', '').trim();
    if (token) {
      return token;
    }

    const cookie = ctx.headers.cookie;
    if (cookie) {
      const items = cookie.split(';');
      for (const item of items) {
        if (!item  || !item.trim()) {
          continue;
        }
        const [key, value] = item.split('=');
        if (key.trim() === 'certd_token') {
          return value.trim();
        }
      }
    }

    return (ctx.query.token as string) || '';
  }

  async doOpenHandler(ctx: IMidwayKoaContext) {
    //开放接口
    const openKey = ctx.get('x-certd-token') || '';
    if (!openKey) {
      return null;
    }

    //校验 openKey
    const openKeyRes = await this.openKeyService.verifyOpenKey(openKey);
    let roles = [1]
    if (!openKeyRes.projectId || openKeyRes.projectId <= 0) {
      roles = await this.roleService.getRoleIdsByUserId(openKeyRes.userId);
    }
    ctx.user = { id: openKeyRes.userId, roles ,projectId:openKeyRes.projectId};
    ctx.openKey = openKeyRes;
    return openKeyRes;
  }
}
