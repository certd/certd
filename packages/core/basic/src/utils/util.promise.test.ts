/// <reference types="mocha" />

import { expect } from "chai";

import { logger } from "./util.log.js";
import { promises } from "./util.promise.js";

describe("promises", () => {
  describe("TimeoutPromise", () => {
    it("resolves when the callback finishes before the timeout", async () => {
      let completed = false;

      await promises.TimeoutPromise(async () => {
        completed = true;
      }, 50);

      expect(completed).to.equal(true);
    });

    it("rejects when the callback exceeds the timeout", async () => {
      try {
        await promises.TimeoutPromise(() => new Promise<void>(resolve => setTimeout(resolve, 30)), 5);
        expect.fail("expected TimeoutPromise to reject");
      } catch (e: any) {
        expect(e.message).to.equal("Task timeout in 5 ms");
      }
    });
  });

  describe("safePromise", () => {
    it("resolves values provided by the callback", async () => {
      const result = await promises.safePromise<string>(resolve => {
        resolve("ok");
      });

      expect(result).to.equal("ok");
    });

    it("rejects synchronous errors thrown by the callback", async () => {
      const oldLevel = logger.level;
      logger.level = "fatal";
      try {
        await promises.safePromise(() => {
          throw new Error("boom");
        });
        expect.fail("expected safePromise to reject");
      } catch (e: any) {
        expect(e.message).to.equal("boom");
      } finally {
        logger.level = oldLevel;
      }
    });
  });

  describe("promisify", () => {
    it("resolves callback data", async () => {
      const readValue = promises.promisify((prefix: string, callback: (err: Error | null, data?: string) => void) => {
        callback(null, `${prefix}-value`);
      });

      expect(await readValue("certd")).to.equal("certd-value");
    });

    it("rejects callback errors", async () => {
      const failing = promises.promisify((callback: (err: Error) => void) => {
        callback(new Error("callback failed"));
      });

      try {
        await failing();
        expect.fail("expected promisified function to reject");
      } catch (e: any) {
        expect(e.message).to.equal("callback failed");
      }
    });

    it("rejects synchronous errors", async () => {
      const failing = promises.promisify(() => {
        throw new Error("sync failed");
      });

      try {
        await failing();
        expect.fail("expected promisified function to reject");
      } catch (e: any) {
        expect(e.message).to.equal("sync failed");
      }
    });
  });
});
