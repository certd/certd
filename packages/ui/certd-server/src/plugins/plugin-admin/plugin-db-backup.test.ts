import assert from "node:assert/strict";
import esmock from "esmock";
import { AbstractTaskPlugin, pluginRegistry } from "@certd/pipeline";

describe("DBBackupPlugin SSH cleanup", () => {
  let originalRegistration: any;

  beforeEach(() => {
    originalRegistration = pluginRegistry.getStorage().DBBackupPlugin;
  });

  afterEach(() => {
    if (originalRegistration) {
      pluginRegistry.register("DBBackupPlugin", originalRegistration);
    } else {
      pluginRegistry.unRegister("DBBackupPlugin");
    }
  });

  async function loadPlugin() {
    const sshCalls: any[] = [];
    class MockSshClient {
      async uploadFiles() {}
      async exec(options: any) {
        sshCalls.push(options);
      }
    }
    const loaded = await esmock("./plugin-db-backup.js", {
      "@certd/plugin-plus": { AbstractPlusTaskPlugin: AbstractTaskPlugin },
      "../plugin-lib/ssh/index.js": { SshClient: MockSshClient },
    });
    const plugin = new loaded.DBBackupPlugin();
    plugin.checkAdmin = () => {};
    plugin.getAccess = async () => ({ windows: false });
    plugin.ctx = { logger: { info() {}, error() {} } } as any;
    return { plugin, sshCalls };
  }

  it("quotes remote directory and filename prefix as literal shell arguments", async () => {
    const { plugin, sshCalls } = await loadPlugin();
    Object.assign(plugin, {
      backupDir: "/srv/backup with ' quote; touch /tmp/should-not-run",
      filePrefix: "db' ; touch /tmp/also-no",
      retainDays: 20,
      sshAccessId: 1,
      logger: {},
    });
    Object.defineProperty(plugin, "logger", { value: { info() {}, error() {} }, writable: true, configurable: true });

    await (plugin as any).sshBackup("local.zip", plugin.backupDir, `${plugin.backupDir}/file.zip`);

    const script = sshCalls[0].script.join("\n");
    assert.ok(script.includes("cd -- '/srv/backup with '\\'' quote; touch /tmp/should-not-run'"));
    assert.ok(script.includes("-name 'db'\\'' ; touch /tmp/also-no_*.zip'"));
  });

  it("rejects path-like filename prefixes before creating temporary files", async () => {
    const { plugin } = await loadPlugin();
    Object.assign(plugin, { filePrefix: "../../outside", retainDays: 0, backupMode: "local", logger: {} });

    await assert.rejects(() => plugin.execute(), /备份文件前缀格式无效/);
  });

  it("rejects non-integer retention days", async () => {
    const { plugin } = await loadPlugin();
    Object.assign(plugin, { filePrefix: "db_backup", retainDays: "1; touch /tmp/no", backupMode: "ssh", logger: {} });

    await assert.rejects(() => plugin.execute(), /保留天数必须是非负整数/);
  });
});
