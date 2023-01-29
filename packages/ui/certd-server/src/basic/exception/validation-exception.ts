import { Constants } from '../constants';
import { BaseException } from './base-exception';
/**
 * 校验异常
 */
export class ValidateException extends BaseException {
  constructor(message) {
    super(
      'ValidateException',
      Constants.res.validation.code,
      message ? message : Constants.res.validation.message
    );
  }
}
