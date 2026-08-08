export class NoPermissionError extends Error {
  constructor(message?: string) {
    super(message || "对不起，您没有权限执行此操作");
  }
}
