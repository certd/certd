//import { expect } from "chai";
import "mocha";
import { Executor, RunHistory, FileStorage } from "@certd/pipeline";
import { pipeline } from "./pipeline.define";
import { AccessServiceTest } from "./access-service-test";
import "../../src";
describe("pipeline", function () {
  it("#pipeline", async function () {
    this.timeout(120000);
    function onChanged(history: RunHistory) {
      console.log("changed:");
    }

    const executor = new Executor({ userId: "test", pipeline, onChanged, accessService: new AccessServiceTest(), storage: new FileStorage() });
    await executor.run(1, "user");
    // expect(define.name).eq("EchoPlugin");
  });
});
