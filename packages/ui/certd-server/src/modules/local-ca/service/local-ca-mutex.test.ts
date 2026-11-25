import assert from "node:assert/strict";
import { KeyedAsyncMutex } from "./local-ca-mutex.js";

describe("local-ca-mutex", () => {
  it("同键串行化读改写，避免并发丢失更新", async () => {
    const mutex = new KeyedAsyncMutex();
    let counter = 0;
    const task = async () => {
      const read = counter;
      await new Promise(resolve => setTimeout(resolve, 5));
      counter = read + 1;
    };
    await Promise.all(Array.from({ length: 20 }, () => mutex.runExclusive("k", task)));
    assert.equal(counter, 20);
  });

  it("不同键互不阻塞", async () => {
    const mutex = new KeyedAsyncMutex();
    const order: string[] = [];
    const a = mutex.runExclusive("a", async () => {
      await new Promise(resolve => setTimeout(resolve, 20));
      order.push("a");
    });
    const b = mutex.runExclusive("b", async () => {
      order.push("b");
    });
    await Promise.all([a, b]);
    assert.deepEqual(order, ["b", "a"]);
  });

  it("任务抛错后释放锁，后续任务仍可执行", async () => {
    const mutex = new KeyedAsyncMutex();
    await assert.rejects(
      mutex.runExclusive("k", async () => {
        throw new Error("boom");
      }),
      /boom/
    );
    const result = await mutex.runExclusive("k", async () => "ok");
    assert.equal(result, "ok");
  });
});