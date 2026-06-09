import { SqliteAdapter } from "./sqlite.js";
import { PostgresqlAdapter } from "./postgresql.js";
import { Config, Init, Provide, Scope, ScopeEnum } from "@midwayjs/core";
import { SqlAdapter } from "./d.js";
import { MysqlAdapter } from "./mysql.js";

@Provide()
@Scope(ScopeEnum.Request, { allowDowngrade: true })
export class DbAdapter implements SqlAdapter {
  adapter: SqlAdapter;
  @Config("typeorm.dataSource.default.type")
  dbType: string;

  @Init()
  async init() {
    if (this.isSqlite()) {
      this.adapter = new SqliteAdapter();
    } else if (this.isPostgresql()) {
      this.adapter = new PostgresqlAdapter();
    } else if (this.isMysql()) {
      this.adapter = new MysqlAdapter();
    } else {
      throw new Error(`dbType ${this.dbType} not support， 请实现Adapter`);
    }
  }

  isSqlite() {
    return this.dbType === "better-sqlite3";
  }
  isPostgresql() {
    return this.dbType === "postgres";
  }
  isMysql() {
    return this.dbType === "mysql" || this.dbType === "mariadb";
  }

  date(columnName: string) {
    return this.adapter.date(columnName);
  }
}
