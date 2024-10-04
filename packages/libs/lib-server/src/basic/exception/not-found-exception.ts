import { Constants } from '../constants.js';
import { BaseException } from './base-exception.js';
/**
 * 资源不存在
 */
export class NotFoundException extends BaseException {
  constructor(message) {
    super('NotFoundException', Constants.res.notFound.code, message ? message : Constants.res.notFound.message);
  }
}
