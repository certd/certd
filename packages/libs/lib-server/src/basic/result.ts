export class Result<T> {
  code: number;
  message: string;
  data: T;

  constructor(code, message, data?) {
    this.code = code;
    this.message = message;
    this.data = data;
  }

  static error(code = 1, message, data?: any) {
    return new Result(code, message, data);
  }

  static success(message, data?) {
    return new Result(0, message, data);
  }
}
