import { expect } from "chai";
import "mocha";
import { DeployCertToAliyunCDN } from "../../../src/plugin";
import { pluginInitProps } from "../init.test";

describe("DeployToAliyunCDN", function () {
  it("#execute", async function () {
    this.timeout(120000);
    const plugin = new DeployCertToAliyunCDN();
    // @ts-ignore
    delete plugin.define;

    await plugin.doInit(pluginInitProps);

    const cert = await pluginInitProps.pipelineContext.get("cert");

    await plugin.execute({
      cert,
      domainName: "certd-cdn-upload.docmirror.cn",
    });
    expect(plugin.getDefine().name).eq("DeployCertToAliyunCDN");
  });
});
