import { Constants } from '../constants';
import { BaseException } from './base-exception';
/**
 * 通用异常
 */
export class CommonException extends BaseException {
  constructor(message) {
    super(
      'CommonException',
      Constants.res.error.code,
      message ? message : Constants.res.error.message
    );
  }
}
