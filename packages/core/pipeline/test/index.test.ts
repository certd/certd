import { expect } from "chai";
import "mocha";
import { EchoPlugin } from "../src/plugin/plugins";
describe("task_plugin", function () {
  it("#taskplugin", function () {
    const define = EchoPlugin.define;
    new EchoPlugin().execute({ context: {}, props: { test: 111 } });
    expect(define.name).eq("EchoPlugin");
  });
});
