import { expect } from "chai";
import "mocha";
import { EchoPlugin } from "../src/plugin";
describe("task_plugin", function () {
  it("#taskplugin", function () {
    const echoPlugin = new EchoPlugin();
    const define = echoPlugin.define;
    echoPlugin.execute({ context: {}, props: { test: 111 } });
    expect(define.name).eq("EchoPlugin");
  });
});
