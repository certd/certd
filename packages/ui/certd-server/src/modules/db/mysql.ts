import { SqlAdapter } from "./d.js";

export class MysqlAdapter implements SqlAdapter {
  date(columnName: string) {
    return `DATE_FORMAT(${columnName}, '%Y-%m-%d')`;
  }
}
