/// <reference types="mocha" />
/// <reference types="node" />

import assert from "node:assert/strict";
import { isNotificationType, NotificationTypes } from "./notification-constants.js";

describe("NotificationTypes", () => {
  it("includes pipeline and server business notification types", () => {
    assert.equal(NotificationTypes.PipelineResult, "pipelineResult");
    assert.equal(NotificationTypes.CertDeployError, "certDeployError");
    assert.equal(NotificationTypes.ForgotPassword, "forgotPassword");
  });

  it("recognizes registered notification types only", () => {
    assert.equal(isNotificationType(NotificationTypes.CertDeployError), true);
    assert.equal(isNotificationType("unknown"), false);
  });
});
