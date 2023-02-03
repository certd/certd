import { Constants } from '../constants';
import { BaseException } from './base-exception';
/**
 * 预览模式
 */
export class PreviewException extends BaseException {
  constructor(message) {
    super(
      'PreviewException',
      Constants.res.preview.code,
      message ? message : Constants.res.preview.message
    );
  }
}
