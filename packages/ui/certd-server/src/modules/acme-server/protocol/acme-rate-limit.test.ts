import assert from "node:assert/strict";
import { AcmeRateLimiter } from "./acme-rate-limit.js";

describe("acme-rate-limit", () => {
  it("窗口内超过阈值后拒绝", () => {
    let now = 1000;
    const limiter = new AcmeRateLimiter(3, 60000, 100, () => now);
    assert.ok(limiter.take("ip") >= 0);
    assert.ok(limiter.take("ip") >= 0);
    assert.ok(limiter.take("ip") >= 0);
    assert.ok(limiter.take("ip") < 0);
    assert.ok(limiter.retryAfterSeconds("ip") > 0);
  });

  it("窗口结束后重置计数", () => {
    let now = 1000;
    const limiter = new AcmeRateLimiter(2, 60000, 100, () => now);
    limiter.take("ip");
    limiter.take("ip");
    assert.ok(limiter.take("ip") < 0);
    now += 60001;
    assert.ok(limiter.take("ip") >= 0);
  });

  it("不同来源IP独立计数", () => {
    const limiter = new AcmeRateLimiter(1, 60000, 100);
    assert.ok(limiter.take("a") >= 0);
    assert.ok(limiter.take("a") < 0);
    assert.ok(limiter.take("b") >= 0);
  });
});