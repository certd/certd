import assert from "node:assert/strict";
import { AcmeNonceStore } from "./acme-nonce.js";

describe("AcmeNonceStore", () => {
  it("限制容量并只清理过期的头部条目", () => {
    let now = 1000;
    const store = new AcmeNonceStore(3, 100, () => now);
    const first = store.create();
    store.create();
    store.create();
    assert.equal(store.size, 3);

    const fourth = store.create();
    assert.equal(store.size, 3);
    assert.equal(store.consume(first), false);

    now = 1101;
    store.create();
    assert.equal(store.size, 1);
    assert.equal(store.consume(fourth), false);
  });

  it("nonce 只能消费一次", () => {
    const store = new AcmeNonceStore();
    const nonce = store.create();
    assert.equal(store.consume(nonce), true);
    assert.equal(store.consume(nonce), false);
  });
});
