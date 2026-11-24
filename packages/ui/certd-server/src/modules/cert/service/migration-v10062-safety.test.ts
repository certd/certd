import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import Database from "better-sqlite3";

const serverRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../..");
const migrationFile = path.join(serverRoot, "db/migration/v10062__local_ca_cleanup.sql");

describe("v10062 pre-EAB account cleanup safety", () => {
  it("只删除关联 cd_local_ca 的旧账户及其订单/授权/挑战", async function (this: any) {
    let db: Database.Database;
    try {
      db = new Database(":memory:");
    } catch (e: any) {
      return this.skip();
    }
    try {
      db.exec(`
        CREATE TABLE cd_local_ca (id integer PRIMARY KEY);
        CREATE TABLE cd_acme_account (id varchar(32) PRIMARY KEY, ca_id integer, eab_id varchar(32));
        CREATE TABLE cd_acme_order (id varchar(32) PRIMARY KEY, account_id varchar(32));
        CREATE TABLE cd_acme_authz (id varchar(32) PRIMARY KEY, account_id varchar(32));
        CREATE TABLE cd_acme_challenge (id varchar(32) PRIMARY KEY, account_id varchar(32));
        CREATE TABLE cd_cert_info (id integer PRIMARY KEY);
        CREATE TABLE cd_cert_revocation (id integer PRIMARY KEY);
        CREATE TABLE cd_acme_eab (id varchar(32) PRIMARY KEY);
      `);
      db.exec(`
        INSERT INTO cd_local_ca (id) VALUES (10), (20);
        INSERT INTO cd_acme_account (id, ca_id, eab_id) VALUES
          ('old-local-a', 10, NULL),
          ('old-other-ca', 99, NULL),
          ('bound-local', 10, 'eab-1'),
          ('old-local-b', 20, NULL);
        INSERT INTO cd_acme_order (id, account_id) VALUES
          ('order-a', 'old-local-a'),
          ('order-other', 'old-other-ca'),
          ('order-bound', 'bound-local'),
          ('order-b', 'old-local-b');
        INSERT INTO cd_acme_authz (id, account_id) VALUES
          ('authz-a', 'old-local-a'),
          ('authz-other', 'old-other-ca'),
          ('authz-bound', 'bound-local'),
          ('authz-b', 'old-local-b');
        INSERT INTO cd_acme_challenge (id, account_id) VALUES
          ('challenge-a', 'old-local-a'),
          ('challenge-other', 'old-other-ca'),
          ('challenge-bound', 'bound-local'),
          ('challenge-b', 'old-local-b');
        INSERT INTO cd_cert_info (id) VALUES (1);
        INSERT INTO cd_cert_revocation (id) VALUES (1);
        INSERT INTO cd_acme_eab (id) VALUES ('eab-1');
      `);

      db.exec(fs.readFileSync(migrationFile, "utf8"));

      assert.deepEqual(
        db
          .prepare("SELECT id FROM cd_acme_account ORDER BY id")
          .all()
          .map((item: any) => item.id),
        ["bound-local", "old-other-ca"]
      );
      assert.deepEqual(
        db
          .prepare("SELECT id FROM cd_acme_order ORDER BY id")
          .all()
          .map((item: any) => item.id),
        ["order-bound", "order-other"]
      );
      assert.deepEqual(
        db
          .prepare("SELECT id FROM cd_acme_authz ORDER BY id")
          .all()
          .map((item: any) => item.id),
        ["authz-bound", "authz-other"]
      );
      assert.deepEqual(
        db
          .prepare("SELECT id FROM cd_acme_challenge ORDER BY id")
          .all()
          .map((item: any) => item.id),
        ["challenge-bound", "challenge-other"]
      );
      assert.equal(db.prepare("SELECT count(*) c FROM cd_cert_info").get().c, 1);
      assert.equal(db.prepare("SELECT count(*) c FROM cd_cert_revocation").get().c, 1);
      assert.equal(db.prepare("SELECT count(*) c FROM cd_acme_eab").get().c, 1);
    } finally {
      db.close();
    }
  });
});
