export class NonRetryableException extends Error {
  constructor(message: string) {
    super(message);
    this.name = "NonRetryableException";
  }
}
