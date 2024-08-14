import { Constants } from '../constants.js';
import { BaseException } from './base-exception.js';
/**
 * 需要vip异常
 */
export class NeedVIPException extends BaseException {
  constructor(message) {
    super('NeedVIPException', Constants.res.needvip.code, message ? message : Constants.res.needvip.message);
  }
}
