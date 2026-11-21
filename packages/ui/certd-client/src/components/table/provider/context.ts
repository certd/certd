import type { ComputedRef, InjectionKey } from "vue";
import { provide } from "vue";
import type { FnCrudOptions, FnCrudSearchState, FnTableSelectionContext, FnTableProps } from "../types/index";
import { createFnNotification } from "../notification/fn-notification";

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

export class UiContext {
  readonly notificationItems: ReturnType<typeof createFnNotification>["items"];
  private services: FnUiServices;

  constructor() {
    const defaults = createFnNotification();
    this.notificationItems = defaults.items;
    this.services = defaults.services;
  }

  getServices(): FnUiServices {
    return this.services;
  }

  setServices(services: FnUiServices): void {
    this.services = services;
  }
}

export class FnCrudContext {
  private commonOptions: () => Partial<FnCrudOptions> = () => ({});

  configure(options: { commonOptions: () => Partial<FnCrudOptions> }): void {
    this.commonOptions = options.commonOptions;
  }

  getCommonOptions(): Partial<FnCrudOptions> {
    return this.commonOptions();
  }
}

export const uiContext = new UiContext();
export const fnCrudContext = new FnCrudContext();
export const fnUiServicesKey: InjectionKey<FnUiServices> = Symbol("FnUiServices");

export const fnCrudSearchKey: InjectionKey<FnCrudSearchState> = Symbol("FnCrudSearch");
export const fnCrudTableSelectionKey: InjectionKey<FnTableSelectionContext> = Symbol("FnCrudTableSelection");
export const fnTableSizeKey: InjectionKey<ComputedRef<Pick<FnTableProps, "size" | "density">>> = Symbol("FnTableSize");
export function provideFnUiServices(): void {
  provide(fnUiServicesKey, uiContext.getServices());
}
