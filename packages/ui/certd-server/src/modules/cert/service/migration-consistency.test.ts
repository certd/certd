import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const serverRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../..");
const migrationDir = path.join(serverRoot, "db/migration");
const dialectDirs = {
  sqlite: migrationDir,
  pg: path.join(serverRoot, "db/migration-pg"),
  mysql: path.join(serverRoot, "db/migration-mysql"),
};
const files = fs
  .readdirSync(migrationDir)
  .filter(file => /^v100(6[1-9]|7[01])__.*\.sql$/.test(file))
  .sort();

type TableColumns = Map<string, Set<string>>;

function stripIdent(value: string) {
  return value.replace(/[`"]/g, "").trim();
}

function parseCreateTables(sql: string): TableColumns {
  const tables: TableColumns = new Map();
  const tableReg = /CREATE TABLE\s+[`"]?(\w+)[`"]?\s*\(([\s\S]*?)\)\s*(?:ENGINE[^;]*)?;/gi;
  for (const match of sql.matchAll(tableReg)) {
    const table = stripIdent(match[1]);
    const columns = new Set<string>();
    for (const line of match[2].split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || /^(PRIMARY|UNIQUE|KEY|CONSTRAINT|INDEX)\b/i.test(trimmed)) {
        continue;
      }
      const column = trimmed.match(/^[`"]?([A-Za-z_][\w]*)[`"]?\s+/);
      if (column) {
        columns.add(column[1]);
      }
    }
    tables.set(table, columns);
  }
  return tables;
}

function parseAlterColumns(sql: string) {
  const result = new Set<string>();
  const reg = /ALTER TABLE\s+[`"]?(\w+)[`"]?\s+ADD COLUMN\s+[`"]?(\w+)[`"]?/gi;
  for (const match of sql.matchAll(reg)) {
    result.add(`${stripIdent(match[1])}.${stripIdent(match[2])}`);
  }
  return result;
}

function parseIndexes(sql: string) {
  const result = new Set<string>();
  const reg = /CREATE\s+(?:UNIQUE\s+)?INDEX\s+[`"]?(\w+)[`"]?\s+ON\s+[`"]?(\w+)[`"]?\s*\(([^)]*)\)/gi;
  for (const match of sql.matchAll(reg)) {
    const columns = match[3]
      .split(",")
      .map(item =>
        stripIdent(item)
          .replace(/\(\d+\)$/, "")
          .trim()
      )
      .filter(Boolean)
      .join(",");
    result.add(`${stripIdent(match[1])}:${stripIdent(match[2])}(${columns})`);
  }
  return result;
}

function parseMigration(dialect: keyof typeof dialectDirs, file: string) {
  const sql = fs.readFileSync(path.join(dialectDirs[dialect], file), "utf8");
  return {
    tables: parseCreateTables(sql),
    alterColumns: parseAlterColumns(sql),
    indexes: parseIndexes(sql),
  };
}

function assertColumnsEqual(dialect: string, file: string, expected: TableColumns, actual: TableColumns) {
  assert.deepEqual([...actual.keys()].sort(), [...expected.keys()].sort(), `${file} ${dialect} 表名不一致`);
  for (const [table, columns] of expected) {
    const actualColumns = actual.get(table);
    assert.ok(actualColumns, `${file} ${dialect} 缺少表 ${table}`);
    assert.deepEqual([...actualColumns].sort(), [...columns].sort(), `${file} ${dialect} 表 ${table} 字段不一致`);
  }
}

function migrationFiles(dir: string) {
  return fs
    .readdirSync(dir)
    .filter(file => /^v100(6[1-9]|7[01])__.*\.sql$/.test(file))
    .sort();
}

describe("local CA migration consistency", () => {
  it("三种数据库的迁移文件集合完全一致", () => {
    for (const dialect of ["pg", "mysql"]) {
      assert.deepEqual(migrationFiles(dialectDirs[dialect]), files, `${dialect} 迁移文件集合不一致`);
    }
  });

  it("SQLite/PostgreSQL/MySQL 表、字段、ALTER 字段和索引一致", () => {
    for (const file of files) {
      const sqlite = parseMigration("sqlite", file);
      for (const dialect of ["pg", "mysql"] as const) {
        const other = parseMigration(dialect, file);
        assertColumnsEqual(dialect, file, sqlite.tables, other.tables);
        assert.deepEqual([...other.alterColumns].sort(), [...sqlite.alterColumns].sort(), `${file} ${dialect} ALTER 字段不一致`);
        assert.deepEqual([...other.indexes].sort(), [...sqlite.indexes].sort(), `${file} ${dialect} 索引不一致`);
      }
    }
  });
});
