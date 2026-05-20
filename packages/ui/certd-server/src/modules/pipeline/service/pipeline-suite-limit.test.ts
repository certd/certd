import assert from "assert";
import { calcNextSuiteCountUsed } from "./pipeline-suite-limit.js";

describe("Pipeline suite limits", () => {
  it("calculates next usage by subtracting current pipeline usage on update", () => {
    assert.equal(calcNextSuiteCountUsed(2, 1, 1), 2);
    assert.equal(calcNextSuiteCountUsed(2, 1, 2), 3);
  });
});
