//import { expect } from "chai";
import "mocha";
import { Executor, RunHistory, FileStorage } from "@certd/pipeline";
import { pipeline } from "./pipeline.huawei";
import { AccessServiceTest } from "./access-service-test";
import "../../src";
import "../plugin/echo-plugin";
describe("pipeline-hauwei-test", function () {
  it("#pipeline", async function () {
    //@ts-ignore
    this.timeout(120000);
    async function onChanged(history: RunHistory) {
      console.log("changed:");
    }

    const executor = new Executor({ userId: "test", pipeline, onChanged, accessService: new AccessServiceTest(), storage: new FileStorage() });
    await executor.run(2, "user");
    // expect(define.name).eq("EchoPlugin");
  });
});
