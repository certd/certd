import { CommonException, SysSettingsService } from "@certd/lib-server";
import { Autoload, Config, Init, Inject, Provide, Scope, ScopeEnum } from '@midwayjs/core';
import { IMidwayKoaContext, IWebMiddleware, NextFunction } from '@midwayjs/koa';
import { UserSettingsService } from "../../modules/mine/service/user-settings-service.js";
import { UserService } from '../../modules/sys/authority/service/user-service.js';

/**
 * 重置密码模式
 */
@Provide()
@Autoload()
@Scope(ScopeEnum.Singleton)
export class ResetPasswdMiddleware implements IWebMiddleware {
  @Inject()
  userService: UserService;

  @Inject()
  userSettingsService: UserSettingsService;
  @Inject()
  sysSettingsService: SysSettingsService;

  @Config('system.resetAdminPasswd')
  private resetAdminPasswd: boolean;
  resolve() {
    return async (ctx: IMidwayKoaContext, next: NextFunction) => {
      if (this.resetAdminPasswd === true) {
        throw new CommonException('1号管理员密码已修改为123456，当前为重置密码模式，无法响应请求，请关闭重置密码模式恢复正常服务');
      }
      await next();
    };
  }

  @Init()
  async init() {
    
  }
}
