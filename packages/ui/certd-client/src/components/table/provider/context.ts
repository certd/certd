import type { InjectionKey } from "vue";
import { inject, provide } from "vue";
import type { FnCrudSearchState, FnTableSelectionContext } from "../types/index";

export interface FnFeedbackApi {
  success(options: any): void;
  error(options: any): void;
  warning?(options: any): void;
  warn?(options: any): void;
  info?(options: any): void;
  open?(options: any): void;
  loading?(options: any): unknown;
  destroy?(): void;
}

export interface FnUiServices {
  notification: FnFeedbackApi;
  message: FnFeedbackApi;
}

export const fnCrudSearchKey: InjectionKey<FnCrudSearchState> = Symbol("FnCrudSearch");
export const fnCrudTableSelectionKey: InjectionKey<FnTableSelectionContext> = Symbol("FnCrudTableSelection");
export const fnUiServicesKey: InjectionKey<FnUiServices> = Symbol("FnUiServices");

export function provideFnUiServices(services: FnUiServices): void {
  provide(fnUiServicesKey, services);
}

export function useFnUiServices(): FnUiServices {
  const services = inject(fnUiServicesKey);
  if (!services) {
    throw new Error("Fn feedback services require FnConfigProvider");
  }
  return services;
}
