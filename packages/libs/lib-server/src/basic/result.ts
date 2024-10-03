export class Result<T> {
  code: number;
  msg: string;
  data: T;
  constructor(code, msg, data?) {
    this.code = code;
    this.msg = msg;
    this.data = data;
  }

  static error(code = 1, msg) {
    return new Result(code, msg, null);
  }

  static success(msg, data?) {
    return new Result(0, msg, data);
  }
}
