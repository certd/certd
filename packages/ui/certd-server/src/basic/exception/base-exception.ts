/**
 * 异常基类
 */
export class BaseException extends Error {
  status: number;
  constructor(name, code, message) {
    super(message);
    this.name = name;
    this.status = code;
  }
}
