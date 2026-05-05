import assert from "node:assert/strict";
import { directory, getAllSslProviderDomains, getDirectoryUrl } from "./index.js";

declare const describe: any;
declare const it: any;

describe("directory helpers", () => {
    it("selects the provider specific directory endpoint", () => {
        assert.equal(getDirectoryUrl({ sslProvider: "sslcom", pkType: "ec" }), directory.sslcom.ec);
        assert.equal(getDirectoryUrl({ sslProvider: "letsencrypt", pkType: "rsa" }), directory.letsencrypt.production);
    });

    it("includes configured provider domains", () => {
        const domains = getAllSslProviderDomains();

        assert.ok(domains.includes("acme.litessl.com"));
        assert.ok(domains.includes("acme.ssl.com"));
    });
});
