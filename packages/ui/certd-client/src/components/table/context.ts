import type { InjectionKey } from "vue";
import type { FnCrudSearchState, FnTableSelectionContext } from "./types";

export const fnCrudSearchKey: InjectionKey<FnCrudSearchState> = Symbol("FnCrudSearch");
export const fnCrudTableSelectionKey: InjectionKey<FnTableSelectionContext> = Symbol("FnCrudTableSelection");
