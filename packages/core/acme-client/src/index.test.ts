import assert from "node:assert/strict";
import { directory, getDirectoryUrl } from "./index.js";

declare const describe: any;
declare const it: any;

describe("directory helpers", () => {
    it("selects the provider specific directory endpoint", () => {
        assert.equal(getDirectoryUrl({ sslProvider: "sslcom", pkType: "ec" }), directory.sslcom.ec);
        assert.equal(getDirectoryUrl({ sslProvider: "letsencrypt", pkType: "rsa" }), directory.letsencrypt.production);
    });
});
