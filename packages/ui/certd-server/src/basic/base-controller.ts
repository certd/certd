import { Inject } from '@midwayjs/core';
import { Context } from '@midwayjs/koa';
import { Constants } from './constants.js';

export abstract class BaseController {
  @Inject()
  ctx: Context;

  /**
   * 成功返回
   * @param data 返回数据
   */
  ok(data?: any) {
    const res = {
      ...Constants.res.success,
      data: undefined,
    };
    if (data) {
      res.data = data;
    }
    return res;
  }
  /**
   * 失败返回
   * @param msg
   * @param code
   */
  fail(msg: string, code: any) {
    return {
      code: code ? code : Constants.res.error.code,
      msg: msg ? msg : Constants.res.error.code,
    };
  }

  getUserId() {
    const userId = this.ctx.user?.id;
    if (userId == null) {
      throw new Error('Token已过期');
    }
    return userId;
  }
}
