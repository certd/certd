import assert from "node:assert/strict";
import { AtomicLruCache } from "./util.cache.js";

describe("AtomicLruCache.take", () => {
  it("一次性取走值并删除，第二次返回undefined", () => {
    const cache = new AtomicLruCache<string, number>({ max: 10, ttl: 60000 });
    cache.set("k", 1);
    assert.equal(cache.take("k"), 1);
    assert.equal(cache.take("k"), undefined);
    assert.equal(cache.get("k"), undefined);
  });

  it("不存在或已过期时返回undefined", async () => {
    const cache = new AtomicLruCache<string, number>({ max: 10, ttl: 20 });
    assert.equal(cache.take("missing"), undefined);
    cache.set("k", 1, { ttl: 20 });
    await new Promise(resolve => setTimeout(resolve, 35));
    assert.equal(cache.take("k"), undefined);
  });
});


describe("AtomicLruCache atomic operations", () => {
  it("setIfAbsent同进程内最多成功一次", () => {
    const cache = new AtomicLruCache<string, number>({ max: 10, ttl: 60000 });
    assert.equal(cache.setIfAbsent("k", 1), true);
    assert.equal(cache.setIfAbsent("k", 2), false);
    assert.equal(cache.get("k"), 1);
  });

  it("increment并发同步调用不会丢失计数", () => {
    const cache = new AtomicLruCache<string, number>({ max: 10, ttl: 60000 });
    for (let i = 0; i < 5; i++) {
      cache.increment("f", { ttl: 60000 });
    }
    assert.equal(cache.get("f"), 5);
  });
});
