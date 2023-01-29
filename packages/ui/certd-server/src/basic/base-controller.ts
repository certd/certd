import { Inject } from '@midwayjs/decorator';
import { Context } from '@midwayjs/koa';
import { Constants } from './constants';

export abstract class BaseController {
  @Inject()
  ctx: Context;

  /**
   * 成功返回
   * @param data 返回数据
   */
  ok(data) {
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
   * @param message
   */
  fail(msg, code) {
    return {
      code: code ? code : Constants.res.error.code,
      msg: msg ? msg : Constants.res.error.code,
    };
  }
}
