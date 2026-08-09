import { Constants } from "../constants.js";
import { BaseException } from "./base-exception.js";

/**
 * 通用异常
 */
export class CommonException extends BaseException {
  constructor(message) {
    super("CommonException", Constants.res.error.code, message ? message : Constants.res.error.message);
  }
}

export class CodeException extends BaseException {
  constructor(res: { code: number; message: string; data?: any }) {
    super("CodeException", res.code, res.message, res.data);
  }
}

export class TextException extends BaseException {
  constructor(name, code, message, data?) {
    super(name, code, message, data);
  }
}

export class TextedException extends TextException {
  constructor(res: { code: number; message: string; data?: any; name?: string }) {
    const { code, message, data, name } = res;
    super(name || "TextedException", code, message, data);
  }
}
