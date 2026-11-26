import assert from "node:assert/strict";
import { formatResponseError, parseRetryAfterHeader, retry, isPublicUnicastIp } from "./util.js";

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

describe("isPublicUnicastIp", () => {
    it("拒绝IPv4私网/特殊地址，放行公网", () => {
        for (const ip of ["127.0.0.1", "10.0.0.1", "172.16.0.1", "192.168.1.1", "169.254.1.1", "100.64.0.1", "0.0.0.0", "224.0.0.1"]) {
            assert.equal(isPublicUnicastIp(ip), false, ip);
        }
        assert.equal(isPublicUnicastIp("8.8.8.8"), true);
    });
    it("拒绝IPv6特殊用途范围，放行公网", () => {
        for (const ip of ["::1", "::", "fc00::1", "fd12::1", "fe80::1", "2001::1", "2001:db8::1", "2001:0db8::1", "2002::1", "3fff::1", "::ffff:10.0.0.1"]) {
            assert.equal(isPublicUnicastIp(ip), false, ip);
        }
        assert.equal(isPublicUnicastIp("2606:4700::1111"), true);
    });
});
