import { Constants } from '../constants.js';
import { BaseException } from './base-exception.js';
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
