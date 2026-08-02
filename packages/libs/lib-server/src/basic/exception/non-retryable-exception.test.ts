import assert from "assert";
import { NonRetryableException } from "./non-retryable-exception.js";

describe("NonRetryableException", () => {
  it("sets the standard error name and message", () => {
    const error = new NonRetryableException("cannot retry");

    assert.equal(error.name, "NonRetryableException");
    assert.equal(error.message, "cannot retry");
    assert.equal(error instanceof Error, true);
  });
});
