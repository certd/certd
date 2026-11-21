import type { InjectionKey } from "vue";

export interface FnFormContextValue {
  validateField: (key: string) => Promise<void>;
}

export const fnFormContextKey: InjectionKey<FnFormContextValue> = Symbol("fnFormContext");
