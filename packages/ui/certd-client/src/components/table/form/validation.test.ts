import { describe, expect, it } from "vitest";
import { validateFnFormField } from "./validation";

describe("validateFnFormField", () => {
  it("校验值变化后返回错误或清除错误", async () => {
    const column = { rules: [{ required: true, message: "请输入名称" }] };

    await expect(validateFnFormField("name", column, "")).resolves.toBe("请输入名称");
    await expect(validateFnFormField("name", column, "certd")).resolves.toBeUndefined();
  });

  it("支持 async-validator 自定义异步 validator 规则", async () => {
    const column = {
      rules: [
        {
          validator: async (_rule: unknown, value: string) => {
            if (value !== "valid") {
              throw new Error("值无效");
            }
          },
        },
      ],
    };

    await expect(validateFnFormField("code", column, "invalid")).resolves.toBe("值无效");
    await expect(validateFnFormField("code", column, "valid")).resolves.toBeUndefined();
  });

  it("无规则字段保持有效", async () => {
    await expect(validateFnFormField("name", undefined, "")).resolves.toBeUndefined();
  });
});
