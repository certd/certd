import { useAntdvTheme } from "..";
import { uiContext, type FnFeedbackApi } from "../../provider/context";

export function useFnAntdvUi(options: { theme: Parameters<typeof useAntdvTheme>[0]; notification: FnFeedbackApi; message: FnFeedbackApi }): void {
  useAntdvTheme(options.theme);
  uiContext.setServices({
    notification: { ...options.notification, warning: options.notification.warn, warn: options.notification.warn },
    message: { ...options.message, warning: options.message.warn, warn: options.message.warn },
  });
}
