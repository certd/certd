import { SqlAdapter } from "./d.js";

export class SqliteAdapter implements SqlAdapter {
  date(columnName: string) {
    return `date(${columnName}, 'localtime')`;
  }
}
