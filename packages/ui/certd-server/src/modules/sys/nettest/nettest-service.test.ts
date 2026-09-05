import assert from "assert";
import esmock from "esmock";

describe("NetTestService.telnet", () => {
  it("treats nc succeeded output as a successful port connection", async () => {
    const { NetTestService } = await esmock("./nettest-service.js", {
      "@certd/basic": {
        http: {},
        logger: {
          error() {},
        },
        utils: {
          sp: {
            async spawn() {
              return "Connection to baidu.com (110.242.74.102) 443 port [tcp/*] succeeded!";
            },
          },
        },
      },
    });
    const service = new NetTestService();
    (service as any).isWindows = () => false;

    const result = await service.telnet("baidu.com", 443);

    assert.equal(result.success, true);
    assert.equal(result.message, "端口连接测试成功");
  });
});
