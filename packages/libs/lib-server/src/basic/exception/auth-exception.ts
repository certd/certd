import { Constants } from "../constants.js";
import { BaseException } from "./base-exception.js";
import { TextException } from "./common-exception.js";
/**
 * 授权异常
 */
export class AuthException extends BaseException {
  constructor(message?: string) {
    super("AuthException", Constants.res.auth.code, message ? message : Constants.res.auth.message);
  }
}

export class Need2FAException extends TextException {
  constructor(message: string, data: any) {
    super("Need2FAException", Constants.res.need2fa.code, message ? message : Constants.res.need2fa.message, data);
  }
}
