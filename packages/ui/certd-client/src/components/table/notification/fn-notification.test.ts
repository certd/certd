import { afterEach, describe, expect, it, vi } from "vitest";
import { createFnNotification } from "./fn-notification";

describe("Fn notification fallback", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("adds typed notifications and expires them after three seconds", () => {
    vi.useFakeTimers();
    const { items, notification } = createFnNotification();

    notification.error({ message: "保存失败", description: "网络异常" });

    expect(items.value).toHaveLength(1);
    expect(items.value[0]).toMatchObject({ type: "error", message: "保存失败", description: "网络异常" });

    vi.advanceTimersByTime(3000);

    expect(items.value).toHaveLength(0);
  });

  it("uses message as the notification text when description is absent", () => {
    const { items, notification } = createFnNotification();

    notification.success({ message: "保存成功" });

    expect(items.value[0]).toMatchObject({ type: "success", message: "保存成功", description: "" });
  });

  it("initializes the default notification and message services", () => {
    const defaults = createFnNotification();

    expect(defaults.services.notification).toBe(defaults.notification);
    expect(defaults.services.message).toBe(defaults.message);
  });
});
