import { Constants } from '../constants';
import { BaseException } from './base-exception';
/**
 * 授权异常
 */
export class PermissionException extends BaseException {
  constructor(message) {
    super(
      'PermissionException',
      Constants.res.permission.code,
      message ? message : Constants.res.permission.message
    );
  }
}
