import {
  Autoload,
  Config,
  Init,
  Inject,
  Provide,
  Scope,
  ScopeEnum,
} from '@midwayjs/core';
import { IMidwayKoaContext, IWebMiddleware, NextFunction } from '@midwayjs/koa';
import { CommonException } from '../../basic/exception/common-exception.js';
import { UserService } from '../../modules/authority/service/user-service.js';
import { logger } from '../../utils/logger.js';

/**
 * 重置密码模式
 */
@Provide()
@Autoload()
@Scope(ScopeEnum.Singleton)
export class ResetPasswdMiddleware implements IWebMiddleware {
  @Inject()
  userService: UserService;
  @Config('system.resetAdminPasswd')
  private resetAdminPasswd: boolean;
  resolve() {
    return async (ctx: IMidwayKoaContext, next: NextFunction) => {
      if (this.resetAdminPasswd === true) {
        throw new CommonException(
          '1号管理员密码已修改为123456，当前为重置密码模式，无法响应请求，请关闭重置密码模式恢复正常服务'
        );
      }
      await next();
    };
  }

  @Init()
  async init() {
    if (this.resetAdminPasswd === true) {
      logger.info('开始重置1号管理员用户的密码');
      const newPasswd = '123456';
      await this.userService.resetPassword(1, newPasswd);
      logger.info(`重置1号管理员用户的密码完成，新密码为：${newPasswd}`);
    }
  }
}
