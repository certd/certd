import assert from "node:assert/strict";
import { SysSafeSetting } from "./models.js";

describe("SysSafeSetting 安全检测开关", () => {
  it("安全设置不再声明重复的 IP 黑名单和用户白名单", () => {
    const setting = new SysSafeSetting();
    assert.equal("ipBlacklist" in setting, false);
    assert.equal("userWhitelist" in setting, false);
  });

  it("URL 扫描和可疑流水线检测默认开启", () => {
    const setting: any = new SysSafeSetting();
    assert.equal(setting.urlScanEnabled, true);
    assert.equal(setting.suspiciousPipelineEnabled, true);
    assert.equal(SysSafeSetting.__key__, "sys.safe");
  });
});
