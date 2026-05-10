import assert from "assert";
import { EabAccess } from "./eab-access.js";

describe("EabAccess", () => {
  it("generates an account key payload for the current kid", async () => {
    const access = new EabAccess();
    access.kid = "kid-1";

    const payload = JSON.parse(await access.onGenerateAccountKey());

    assert.equal(payload.kid, "kid-1");
    assert.match(payload.privateKey, /BEGIN (RSA )?PRIVATE KEY/);
  });

  it("requires kid before generating the account key payload", async () => {
    const access = new EabAccess();

    await assert.rejects(() => access.onGenerateAccountKey(), /请先填写KID/);
  });
});
