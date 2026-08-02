import { Constants } from "../constants.js";
import { BaseException } from "./base-exception.js";
/**
 * 验证码异常
 */
export class CodeErrorException extends BaseException {
  constructor(message) {
    super("CodeErrorException", Constants.res.codeError.code, message ? message : Constants.res.codeError.message);
  }
}
