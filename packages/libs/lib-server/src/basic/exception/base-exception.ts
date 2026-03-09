/**
 * 异常基类
 */
export class BaseException extends Error {
  code: number;
  data?:any
  constructor(name: string, code: number, message: string ,data?:any) {
    super(message);
    this.name = name;
    this.code = code;
    this.data = data;
  }
}
