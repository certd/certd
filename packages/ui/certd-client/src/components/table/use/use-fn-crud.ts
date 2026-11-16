import type { FnCrudOptions } from "../types/index";
import { fnCrudContext } from "../provider/context";

export type FnCrudState<Row = any> = FnCrudOptions<Row> & {
  onToggleDensity?: () => void;
};

export function useFnCrud<Row = any>(state: FnCrudState<Row>): FnCrudState<Row>;
export function useFnCrud<Row = any>(state: FnCrudState<Row>): FnCrudState<Row> {
  state.onToggleDensity = () => {
    const currentDensity = state.table?.density || "comfort";
    const nextDensity = currentDensity === "comfort" ? "compact" : "comfort";
    if (!state.table) {
      state.table = { density: nextDensity };
    } else {
      state.table.density = nextDensity;
    }
  };
  return state;
}

export function installFnCrud(options: { commonOptions: () => Partial<FnCrudOptions> }): void {
  fnCrudContext.configure(options);
}
