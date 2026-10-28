import assert from "node:assert/strict";
import { sp } from "./util.sp.js";

describe("sp.spawn", () => {
  it("passes shell metacharacters as a literal argument", async () => {
    const value = "value; echo injected";
    const output = await sp.spawn({
      cmd: process.execPath,
      args: ["-e", "process.stdout.write(process.argv[1])", value],
      options: { shell: true },
    });

    assert.equal(output, value);
  });
});
