import { expect } from "chai";
import "mocha";
import { EchoPlugin } from "./echo-plugin.js";
describe("task_plugin", function () {
  it("#taskplugin", function () {
    console.log("before new plugin");
    const echoPlugin = new EchoPlugin();
    console.log("before set property", echoPlugin);
    echoPlugin.cert = { test: 1 };
    console.log("before execute");
    // @ts-ignore
    echoPlugin.execute();
    console.log("after execute");
    expect(echoPlugin.cert.test).eq(1);
  });
});
