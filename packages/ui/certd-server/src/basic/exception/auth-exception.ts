import { Constants } from '../constants';
import { BaseException } from './base-exception';
/**
 * 授权异常
 */
export class AuthException extends BaseException {
  constructor(message) {
    super(
      'AuthException',
      Constants.res.auth.code,
      message ? message : Constants.res.auth.message
    );
  }
}
