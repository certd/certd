import { afterEach, describe, expect, it, vi } from "vitest";
import type { FnUiServices } from "../../provider/context";
import { UiContext, uiContext } from "../../provider/context";

const { useAntdvTheme } = vi.hoisted(() => ({ useAntdvTheme: vi.fn() }));
vi.mock("..", () => ({ useAntdvTheme }));

import { useFnAntdvUi } from "./index";

describe("useFnAntdvUi", () => {
  afterEach(() => {
    useAntdvTheme.mockReset();
    uiContext.setServices(new UiContext().getServices());
  });

  it("syncs AntDV theme and replaces default feedback services", () => {
    const token = { colorPrimary: "#18a058" };
    const notification: FnUiServices["notification"] = { success: vi.fn(), error: vi.fn() };
    const message: FnUiServices["message"] = { success: vi.fn(), error: vi.fn() };

    useFnAntdvUi({ theme: token, notification, message });

    expect(useAntdvTheme).toHaveBeenCalledWith(token);
    expect(uiContext.getServices().notification.success).toBe(notification.success);
    expect(uiContext.getServices().message.error).toBe(message.error);
  });
});
