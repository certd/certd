import assert from "node:assert/strict";
import { execFileSync, spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

function runSql(dbPath: string, sql: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = spawn("sqlite3", [dbPath], { stdio: ["pipe", "pipe", "pipe"] });
    let out = "";
    let err = "";
    child.stdout.on("data", chunk => (out += String(chunk)));
    child.stderr.on("data", chunk => (err += String(chunk)));
    child.on("error", reject);
    child.on("close", code => {
      if (code !== 0) {
        reject(new Error(err || `sqlite3 exited ${code}`));
        return;
      }
      resolve(out);
    });
    child.stdin.end(sql);
  });
}

describe("Passkey SQLite 真实条件更新竞争", () => {
  let dbPath = "";
  let available = true;
  const oldAt = Date.now() - 31 * 24 * 60 * 60 * 1000;
  const newAt = Date.now();

  before(function (this: any) {
    try {
      execFileSync("sqlite3", ["-version"]);
    } catch {
      available = false;
      this.skip();
    }
    dbPath = path.join(os.tmpdir(), `certd-passkey-race-${process.pid}.sqlite`);
    fs.rmSync(dbPath, { force: true });
    execFileSync("sqlite3", [
      dbPath,
      `CREATE TABLE sys_passkey (id integer primary key, user_id integer not null, disabled boolean not null default 0, last_used_at bigint, last_active_at bigint);`,
    ]);
  });

  after(function () {
    fs.rmSync(dbPath, { force: true });
  });

  it("自动停用与认证成功并发时最终状态一致", async function (this: any) {
    if (!available) {
      this.skip();
    }
    for (let i = 0; i < 10; i++) {
      await runSql(dbPath, `DELETE FROM sys_passkey; INSERT INTO sys_passkey (id,user_id,disabled,last_used_at,last_active_at) VALUES (1,1,0,${oldAt},${oldAt});`);
      const authSql = `PRAGMA busy_timeout=5000;
BEGIN IMMEDIATE;
UPDATE sys_passkey SET last_used_at=${newAt}, last_active_at=${newAt}, disabled=0 WHERE id=1 AND disabled=0;
SELECT 'auth', changes();
.shell sleep 0.03
COMMIT;`;
      const autoSql = `PRAGMA busy_timeout=5000;
BEGIN IMMEDIATE;
UPDATE sys_passkey SET disabled=1 WHERE id=1 AND disabled=0 AND last_active_at=${oldAt};
SELECT 'auto', changes();
.shell sleep 0.03
COMMIT;`;
      const [authOut, autoOut] = await Promise.all([runSql(dbPath, authSql), runSql(dbPath, autoSql)]);
      const parseChanged = (text: string) => Number((text.match(/(\d+)\s*$/) || [])[1]);
      const authChanged = parseChanged(authOut);
      const autoChanged = parseChanged(autoOut);
      const state = JSON.parse(execFileSync("sqlite3", ["-json", dbPath, "SELECT disabled,last_active_at FROM sys_passkey WHERE id=1"]).toString())[0];
      if (Number(state.disabled) === 1) {
        assert.equal(authChanged, 0, "停用胜出时认证更新必须失败");
        assert.equal(autoChanged, 1, "停用应成功一次");
      } else {
        assert.equal(authChanged, 1, "认证胜出时应成功一次");
        assert.equal(autoChanged, 0, "认证更新生命周期时间后自动停用必须失败");
        assert.equal(Number(state.last_active_at), newAt);
      }
    }
  });
});
