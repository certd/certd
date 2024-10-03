import { Constants } from '../constants.js';
import { BaseException } from './base-exception.js';
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
