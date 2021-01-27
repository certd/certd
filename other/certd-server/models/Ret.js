export class Ret {
  constructor (code = 0, msg, data) {
    this.code = code
    this.msg = msg
    this.data = data
  }

  static success (data) {
    return new Ret(0, '', data)
  }

  static error (msg) {
    return new Ret(1, msg)
  }
}
