import { expect } from "chai";
import "mocha";
import { EchoPlugin } from "./echo-plugin";
describe("task_plugin", function () {
  it("#taskplugin", function () {
    const echoPlugin = new EchoPlugin();
    // @ts-ignore
    const define = echoPlugin.getDefine();
    echoPlugin.execute({ context: {}, input: { test: 111 } });
    expect(define.name).eq("EchoPlugin");
  });
});
