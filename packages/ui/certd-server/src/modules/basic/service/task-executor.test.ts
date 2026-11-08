/// <reference types="mocha" />
/// <reference types="node" />

import assert from "node:assert/strict";
import { BackTask } from "./task-executor.js";

describe("BackTask counts", () => {
  it("does not count skipped items as successful", () => {
    const task = new BackTask({
      type: "test",
      key: "test",
      title: "test",
      run: async () => {},
    });
    task.incrementCurrent();
    task.incrementCurrent();
    task.incrementCurrent();
    task.incrementSkip();

    assert.equal(task.getSuccessCount(), 2);
    assert.equal(task.getSkipCount(), 1);
  });

  it("excludes failed items from success without subtracting skipped items twice", () => {
    const task = new BackTask({
      type: "test",
      key: "test",
      title: "test",
      run: async () => {},
    });
    task.incrementCurrent();
    task.incrementCurrent();
    task.incrementCurrent();
    task.incrementSkip();
    task.addError("failed item");

    assert.equal(task.getSuccessCount(), 1);
  });
});
