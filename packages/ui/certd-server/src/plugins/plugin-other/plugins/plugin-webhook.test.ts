import assert from "node:assert/strict";
import { stringUtils } from "@certd/basic";

describe("WebhookDeployCert", () => {
  it("应转义证书内容中的 CRLF，确保替换后仍是合法 JSON", () => {
    const body = stringUtils.replaceTemplate('{"certificate":"${crt}"}', {
      crt: "line1\r\nline2",
    });

    assert.deepEqual(JSON.parse(body), { certificate: "line1\r\nline2" });
  });

  it("应兼容数字等非字符串变量", () => {
    assert.equal(stringUtils.replaceTemplate('{"port":"${port}"}', { port: 443 }), '{"port":"443"}');
  });
});
