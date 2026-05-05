import assert from "node:assert/strict";
import { formatResponseError, parseRetryAfterHeader, retry } from "./util.js";

declare const describe: any;
declare const it: any;

describe("util helpers", () => {
    it("parses retry-after values", () => {
        assert.equal(parseRetryAfterHeader("120"), 120);
        assert.equal(parseRetryAfterHeader("invalid"), 0);
        assert.equal(parseRetryAfterHeader("Wed, 21 Oct 2015 07:28:00 GMT"), 0);
    });

    it("formats response errors without newlines", () => {
        const error = formatResponseError({
            data: {
                error: {
                    detail: "line 1\nline 2",
                },
            },
        });

        assert.equal(error, "line 1line 2");
    });

    it("retries until success", async () => {
        const delays: number[] = [];
        const originalSetTimeout = globalThis.setTimeout;
        let attempts = 0;

        (globalThis as any).setTimeout = (fn: (...args: any[]) => void, delay?: number) => {
            delays.push(Number(delay));
            return originalSetTimeout(fn, 0);
        };

        try {
            const result = await retry(
                async () => {
                    attempts += 1;

                    if (attempts < 3) {
                        throw new Error(`boom-${attempts}`);
                    }

                    return "ok";
                },
                { attempts: 3, min: 10, max: 20 },
                () => {}
            );

            assert.equal(result, "ok");
            assert.equal(attempts, 3);
            assert.deepEqual(delays, [10, 20]);
        } finally {
            (globalThis as any).setTimeout = originalSetTimeout;
        }
    });
});
