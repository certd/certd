import { describe, expect, it, vi } from "vitest";
vi.mock("vue", () => ({ inject: vi.fn(), provide: vi.fn(), onUnmounted: vi.fn() }));
import { model, provideFnModal } from "./dialog";

describe("model.confirm", () => {
  it("通过 provider 打开确认框，隐藏重置按钮并保留确认回调", async () => {
    const openDialog = vi.fn().mockResolvedValue("done");
    provideFnModal({ openDialog });
    const onClick = vi.fn();
    const result = await model.confirm({ title: "确认删除", buttons: { confirm: { text: "删除", onClick } } });
    expect(result).toBe("done");
    expect(openDialog).toHaveBeenCalledWith({ title: "确认删除", width: "400px", buttons: { reset: { show: false }, confirm: { text: "删除", onClick } } });
  });
});
