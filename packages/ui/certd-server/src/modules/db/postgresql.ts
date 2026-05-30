import { SqlAdapter } from "./d.js";

export class PostgresqlAdapter implements SqlAdapter {
  date(columnName: string) {
    return `to_char(${columnName}, 'YYYY-MM-DD')`;
  }
}
