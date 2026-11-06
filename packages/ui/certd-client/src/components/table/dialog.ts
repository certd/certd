import { inject, onUnmounted, provide } from "vue";
import type { FnDialogProps, FnModalService } from "./types";
export type { FnDialogContext, FnDialogProps, FnFormProps, FnModalService, FnFormInstance } from "./types";

const fnModalKey = Symbol("FnModal");
const modalServices: FnModalService[] = [];

export const model = {
  confirm<Result = unknown>(options: FnDialogProps<Result>): Promise<Result | undefined> {
    const service = modalServices[modalServices.length - 1];
    if (!service) {
      throw new Error("model.confirm 必须在 FnModalProvider 注册后调用");
    }
    return service.openDialog<Result>({
      width: "400px",
      ...options,
      buttons: { ...options.buttons, reset: { ...options.buttons?.reset, show: false } },
    });
  },
};

export function provideFnModal(service: FnModalService) {
  provide(fnModalKey, service);
  modalServices.push(service);
  onUnmounted(() => {
    const index = modalServices.indexOf(service);
    if (index >= 0) {
      modalServices.splice(index, 1);
    }
  });
}

export function useFnDialog() {
  const service = inject<FnModalService>(fnModalKey);
  if (!service) {
    throw new Error("useFnDialog 必须在 FnModalProvider 内调用");
  }
  return service;
}
