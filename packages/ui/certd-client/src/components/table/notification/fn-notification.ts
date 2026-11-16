import { ref } from "vue";
import type { FnFeedbackApi, FnUiServices } from "../provider/context";

export interface FnNotificationItem {
  id: number;
  type: "success" | "error" | "warning" | "info" | "loading";
  message: string;
  description: string;
}

export function createFnNotification() {
  const items = ref<FnNotificationItem[]>([]);
  const timers = new Map<number, ReturnType<typeof setTimeout>>();
  let nextId = 0;

  function open(type: FnNotificationItem["type"], options: any): void {
    const id = ++nextId;
    const item: FnNotificationItem = {
      id,
      type,
      message: typeof options === "string" ? options : String(options?.message || options?.content || ""),
      description: typeof options === "object" && options !== null ? String(options.description || "") : "",
    };
    items.value.push(item);
    const timer = setTimeout(() => remove(id), 3000);
    timers.set(id, timer);
  }

  function remove(id: number): void {
    const timer = timers.get(id);
    if (timer) {
      clearTimeout(timer);
      timers.delete(id);
    }
    items.value = items.value.filter(item => item.id !== id);
  }

  function destroy(): void {
    for (const timer of timers.values()) {
      clearTimeout(timer);
    }
    timers.clear();
    items.value = [];
  }

  const notification: FnFeedbackApi = {
    success: options => open("success", options),
    error: options => open("error", options),
    warning: options => open("warning", options),
    warn: options => open("warning", options),
    info: options => open("info", options),
    open: options => open(options?.type || "info", options),
    loading: options => open("loading", options),
    destroy,
  };

  const services: FnUiServices = {
    notification,
    message: notification,
  };

  return { items, notification, message: notification, services };
}
