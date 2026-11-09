import { describe, expect, it } from "vitest";
import { validateIpAddress } from "./index";

describe("IP 地址表单校验", () => {
  it.each(["127.0.0.1", "255.255.255.255", "::1", "2001:db8::1", "::ffff:192.0.2.1", " 192.168.1.1 "])("接受 %s", async value => {
    await expect(validateIpAddress({}, value)).resolves.toBeUndefined();
  });
  it.each(["192.168.1.0/24", "192.168.*", "10.*.*.*", "2001:db8::/32"])("接受规则 %s", async value => {
    await expect(validateIpAddress({}, value)).resolves.toBeUndefined();
  });
  it.each(["1111", "256.1.1.1", "1.2.3", "01.2.3.4", "example.com", "2001::db8::1", "::1/path", "192.168.1.0/33", "192.168.*.1/24", "192.168.1.0/x", "192.168.1.0/24/1"])("拒绝 %s", async value => {
    await expect(validateIpAddress({}, value)).rejects.toThrow("请输入有效的 IP 地址");
  });
  it("空值交给 required 校验", async () => {
    await expect(validateIpAddress({}, undefined)).resolves.toBeUndefined();
  });
});
