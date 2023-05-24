import "mocha";
import { Executor, FileStorage, RunHistory } from "@certd/pipeline";
import { pipeline } from "./pipeline.define";
import { AccessServiceTest } from "./access-service-test";
import "../../src";
import "../plugin/echo-plugin";

describe("pipeline", function () {
  it("#pipeline", async function () {
    this.timeout(120000);
    async function onChanged(history: RunHistory) {
      console.log("changed:");
    }

    const executor = new Executor({ userId: "test", pipeline, onChanged, accessService: new AccessServiceTest(), storage: new FileStorage() });
    await executor.run(1, "user");
    // expect(define.name).eq("EchoPlugin");
  });
});
