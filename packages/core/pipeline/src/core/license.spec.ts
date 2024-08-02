import { isPlus, verify } from "./license.js";
import { equal } from "assert";
describe("license", function () {
  it("#license", async function () {
    const req = {
      appKey: "z4nXOeTeSnnpUpnmsV",
      subjectId: "999",
      license: "",
    };
    const plus = isPlus();
    equal(plus, false);
    const res = await verify(req);
    equal(res, true);
  });
});
