import { Constants } from "../constants.js";
import { BaseException } from "./base-exception.js";
/**
 * 通用异常
 */
export class LoginErrorException extends BaseException {
  leftCount: number;
  constructor(message, leftCount: number) {
    super("LoginErrorException", Constants.res.loginError.code, message ? message : Constants.res.loginError.message);
    this.leftCount = leftCount;
  }
}
