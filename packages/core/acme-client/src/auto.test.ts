import assert from "node:assert/strict";
import auto from "./auto.js";
import { createCsr, createPrivateRsaKey } from "./crypto/index.js";

declare const describe: any;
declare const it: any;

describe("auto challenge status polling", () => {
    it("polls the authorization URL after completing a challenge", async () => {
        const [, csr] = await createCsr({ commonName: "example.com" }, await createPrivateRsaKey());
        const challenge = {
            type: "dns-01",
            url: "https://ca.example/chall/1",
            token: "token",
        };
        const authz = {
            status: "pending",
            identifier: { type: "dns", value: "example.com" },
            url: "https://ca.example/authz/1",
            challenges: [challenge],
        };
        const order = {
            status: "pending",
            url: "https://ca.example/order/1",
            finalize: "https://ca.example/order/1/finalize",
            authorizations: [authz.url],
        };
        const polledUrls: string[] = [];
        const originalSetTimeout = globalThis.setTimeout;

        (globalThis as any).setTimeout = (fn: (...args: any[]) => void) => originalSetTimeout(fn, 0);

        try {
            const certificate = await auto(
                {
                    logger: { info: () => {} },
                    sslProvider: "litessl",
                    getAccountUrl: () => "https://ca.example/acct/1",
                    createOrder: async () => order,
                    getAuthorizations: async () => [authz],
                    getChallengeKeyAuthorization: async () => "key-authorization",
                    verifyChallenge: async () => {},
                    completeChallenge: async () => ({ ...challenge, status: "processing" }),
                    waitForValidStatus: async (item: { url: string }) => {
                        polledUrls.push(item.url);
                        return { ...item, status: "valid" };
                    },
                    finalizeOrder: async () => ({ ...order, status: "valid", certificate: "https://ca.example/cert/1" }),
                    getCertificate: async () => "CERTIFICATE",
                } as any,
                {
                    csr,
                    termsOfServiceAgreed: true,
                    waitDnsDiffuseTime: 0,
                    challengeCreateFn: async (_authz: any, keyAuthorizationGetter: (challenge: any) => Promise<string>) => ({
                        challenge,
                        keyAuthorization: await keyAuthorizationGetter(challenge),
                    }),
                    challengeRemoveFn: async () => {},
                }
            );

            assert.equal(certificate, "CERTIFICATE");
            assert.deepEqual(polledUrls, [authz.url]);
        } finally {
            (globalThis as any).setTimeout = originalSetTimeout;
        }
    });
});
