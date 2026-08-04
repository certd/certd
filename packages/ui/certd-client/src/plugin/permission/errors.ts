export class NoPermissionError extends Error {
  constructor(message?: string) {
    super(message || "Sorry, you do not have permission to perform this action");
  }
}
