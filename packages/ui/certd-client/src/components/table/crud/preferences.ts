import type { FnCrudColumn, FnCrudPreferenceStorage, FnCrudPreferences } from "../types/index";
import { compute, isFnComputeValue, resolveComputedValue } from "./compute";

const storagePrefix = "fn-crud:";

export function getFnCrudPreferenceKey(id: string | undefined, href: string): string {
  if (id) {
    return `${storagePrefix}${id}`;
  }
  const hashIndex = href.indexOf("#");
  const route = hashIndex >= 0 ? href.slice(hashIndex + 1) : href;
  const routePath = route.split(/[?#]/, 1)[0] || "/";
  if (routePath.startsWith("/")) {
    return `${storagePrefix}${routePath}`;
  }
  try {
    return `${storagePrefix}${new URL(href).pathname}`;
  } catch {
    return `${storagePrefix}/${routePath}`;
  }
}

export function createFnCrudPreferenceStorage(remote?: FnCrudPreferenceStorage): FnCrudPreferenceStorage {
  return {
    async get(key) {
      if (remote) {
        try {
          return await remote.get(key);
        } catch {
          // Keep the local snapshot available when the remote preference service is unreachable.
        }
      }
      const value = globalThis.localStorage?.getItem(key);
      return value ? (JSON.parse(value) as FnCrudPreferences) : undefined;
    },
    async set(key, value) {
      if (remote) {
        try {
          globalThis.localStorage?.setItem(key, JSON.stringify(value));
        } catch {
          // Remote storage remains authoritative when browser storage is unavailable.
        }
        await remote.set(key, value);
        return;
      }
      globalThis.localStorage?.setItem(key, JSON.stringify(value));
    },
    async remove(key) {
      if (remote?.remove) {
        await remote.remove(key);
      }
      globalThis.localStorage?.removeItem(key);
    },
  };
}

export function mergeFnCrudPreferences<Row>(columns: Record<string, FnCrudColumn<Row>>, preferences?: FnCrudPreferences): Record<string, FnCrudColumn<Row>> {
  const result: Record<string, FnCrudColumn<Row>> = {};
  const savedColumns = preferences?.columns || {};

  for (const [key, column] of Object.entries(columns)) {
    const saved = savedColumns[key];
    if (!saved) {
      result[key] = column;
      continue;
    }

    const baseCell = column.cell && typeof column.cell === "object" && !isFnComputeValue(column.cell) ? column.cell : {};
    const mergeCell = (cell: Record<string, unknown>) => {
      const nextCell = { ...cell };
      if (saved.order !== undefined) nextCell.order = saved.order;
      if (saved.fixed !== undefined) nextCell.fixed = saved.fixed;
      if (saved.fixed === null) delete nextCell.fixed;
      if (saved.show !== undefined) nextCell.show = saved.show;
      if (saved.width !== undefined) nextCell.width = saved.width;
      return nextCell;
    };
    const cell = isFnComputeValue(column.cell) ? compute(context => mergeCell(resolveComputedValue(column.cell!, context))) : mergeCell(baseCell);
    result[key] = { ...column, show: saved.show ?? column.show, cell };
  }

  return result;
}

export function createFnCrudPreferenceSnapshot<Row>(columns: Record<string, FnCrudColumn<Row>>, columnWidths: Record<string, number>, pageSize: number, density: "compact" | "comfort"): FnCrudPreferences {
  const savedColumns: FnCrudPreferences["columns"] = {};
  for (const [index, [key, column]] of Object.entries(columns).entries()) {
    const cell = column.cell && typeof column.cell === "object" && !("__fnCompute" in column.cell) ? column.cell : {};
    savedColumns[key] = {
      order: typeof cell.order === "number" && Number.isFinite(cell.order) ? cell.order : index,
      show: column.show !== false && cell.show !== false,
      fixed: cell.fixed ?? null,
      width: columnWidths[key] ?? (typeof cell.width === "number" ? cell.width : undefined),
    };
  }
  return { columns: savedColumns, pageSize, density };
}
