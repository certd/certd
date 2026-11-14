import type { FnTableRow } from "./types";

export function getFnTableRowKey(row: FnTableRow, index: number, rowKey?: string | ((row: FnTableRow) => string | number)): string | number {
  if (typeof rowKey === "function") {
    return rowKey(row);
  }
  if (rowKey) {
    const key = row[rowKey];
    return typeof key === "string" || typeof key === "number" ? key : index;
  }
  return typeof row.id === "string" || typeof row.id === "number" ? row.id : index;
}
