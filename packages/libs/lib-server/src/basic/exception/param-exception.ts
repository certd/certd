import { Constants } from '../constants.js';
import { BaseException } from './base-exception.js';
/**
 * 参数异常
 */
export class ParamException extends BaseException {
  constructor(message) {
    super('ParamException', Constants.res.param.code, message ? message : Constants.res.param.message);
  }
}
