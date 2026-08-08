/// <reference types="mocha" />
/// <reference types="node" />

import assert from "node:assert/strict";
import { PipelineNotificationTypes } from "./constants.js";

describe("PipelineNotificationTypes", () => {
  it("contains the pipeline result notification type", () => {
    assert.equal(PipelineNotificationTypes.PipelineResult, "pipelineResult");
  });
});
