import { Constants } from '../constants.js';
import { BaseException } from './base-exception.js';
/**
 * 授权异常
 */
export class PermissionException extends BaseException {
  constructor(message?: string) {
    super(
      'PermissionException',
      Constants.res.permission.code,
      message ? message : Constants.res.permission.message
    );
  }
}
