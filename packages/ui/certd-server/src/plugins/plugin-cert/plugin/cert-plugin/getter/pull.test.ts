import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import esmock from "esmock";
import { pluginRegistry, RunStrategy } from "@certd/pipeline";
import { CertReader } from "@certd/plugin-lib";
// @ts-ignore
import forge from "node-forge";

const keys = forge.pki.rsa.generateKeyPair(2048);

function createCertificate(serial = "01", expired = false) {
  const cert = forge.pki.createCertificate();
  cert.publicKey = keys.publicKey;
  cert.serialNumber = serial;
  cert.validity.notBefore = new Date(Date.now() - 2 * 86400000);
  cert.validity.notAfter = new Date(Date.now() + 90 * 86400000);
  if (expired) {
    cert.validity.notAfter = new Date(Date.now() - 86400000);
  }
  const attrs = [{ name: "commonName", value: "example.com" }];
  cert.setSubject(attrs);
  cert.setIssuer(attrs);
  cert.setExtensions([{ name: "subjectAltName", altNames: [{ type: 2, value: "example.com" }] }]);
  cert.sign(keys.privateKey, forge.md.sha256.create());
  return { crt: forge.pki.certificateToPem(cert), key: forge.pki.privateKeyToPem(keys.privateKey) };
}

describe("CertApplyPull", function (this: Mocha.Suite) {
  this.timeout(20000);
  let originalRegistration: any;

  beforeEach(() => {
    originalRegistration = pluginRegistry.getStorage().CertApplyPull;
  });

  afterEach(() => {
    if (originalRegistration) {
      pluginRegistry.register("CertApplyPull", originalRegistration);
    } else {
      pluginRegistry.unRegister("CertApplyPull");
    }
  });

  async function createPlugin(cert = createCertificate(), downloadError?: Error) {
    const downloads: { remote: string; local: string }[] = [];
    const events: any[] = [];
    const factoryCalls: any[] = [];
    const accesses: any[] = [];
    const loaded = await esmock(
      "./pull.js",
      {
        "../../../../plugin-lib/oss/factory.js": {
          ossClientFactory: {
            async createOssClientByType(type: string, opts: any) {
              factoryCalls.push({ type, opts });
              return {
                async download(remote: string, local: string) {
                  downloads.push({ remote, local });
                  await fs.writeFile(local, cert.crt, "utf8");
                  if (downloadError) {
                    throw downloadError;
                  }
                  if (downloads.length === 2) {
                    await fs.writeFile(local, cert.key, "utf8");
                  }
                },
              };
            },
          },
        },
      },
      {
        "@certd/plugin-lib": {
          CertConverter: class {
            async convert() {
              return { pfx: "converted-pfx" };
            }
          },
        },
      }
    );
    const plugin = new loaded.CertApplyPull();
    const access = { source: "test" };
    plugin.getAccess = async (id: string) => {
      accesses.push(id);
      return access;
    };
    plugin.sourceType = "http";
    plugin.crtPath = "https://example.com/fullchain.pem?token=secret";
    plugin.keyPath = "https://example.com/privkey.pem?token=secret";
    await plugin.setCtx({
      logger: { info() {}, warn() {}, error() {}, addSecret() {} },
      http: {},
      accessService: {},
      utils: {},
      userContext: {},
      inputChanged: false,
      pipeline: { id: 10 },
      step: { id: "pull-task" },
      emitter: {
        async emit(name: string, event: any) {
          events.push({ name, event });
        },
      },
    });
    await plugin.onInstance();
    return { plugin, downloads, events, factoryCalls, accesses, access };
  }

  async function assertTemporaryFilesRemoved(downloads: { local: string }[]) {
    assert.ok(downloads.length > 0);
    await assert.rejects(fs.stat(path.dirname(downloads[0].local)), { code: "ENOENT" });
  }

  it("注册为每次运行的证书来源插件", async () => {
    await createPlugin();
    const define: any = pluginRegistry.get("CertApplyPull").define;
    assert.equal(define.default.strategy.runStrategy, RunStrategy.AlwaysRun);
    assert.equal(define.output.cert.type, "cert");
    assert.equal(define.input.crtPath.required, true);
    assert.equal(define.input.keyPath.required, true);
    assert.ok(define.input.sourceType.component.options.some((item: any) => item.value === "sftp"));
  });

  it("HTTP 来源无需授权，拉取后输出证书、转换格式并发出入库事件", async () => {
    const { plugin, downloads, events, factoryCalls, accesses } = await createPlugin();
    await plugin.execute();
    assert.deepEqual(accesses, []);
    assert.equal(factoryCalls[0].type, "http");
    assert.deepEqual(
      downloads.map(item => item.remote),
      [plugin.crtPath, plugin.keyPath]
    );
    assert.equal(new CertReader(plugin.cert).getMainDomain(), "example.com");
    assert.equal(plugin.cert.pfx, "converted-pfx");
    assert.equal(plugin._result.clearLastStatus, true);
    assert.deepEqual(plugin._result.pipelineVars.certDomains, ["example.com"]);
    assert.equal(events.length, 1);
    assert.equal(events[0].name, "CertApply.success");
    assert.equal(events[0].event.cert, plugin.cert);
    assert.equal(events[0].event.pipelineId, 10);
    assert.equal(events[0].event.runnableId, "pull-task");
    await assertTemporaryFilesRemoved(downloads);
  });

  it("HTTP 来源显示可选授权，其他来源仍要求授权", async () => {
    await createPlugin();
    const define: any = pluginRegistry.get("CertApplyPull").define;
    const input = define.input.accessId;
    const ctx = { compute: (callback: any) => callback };
    const config = new Function("ctx", input.mergeScript)(ctx);
    if (config.show) {
      assert.equal(config.show({ form: { sourceType: "http" } }), true);
    }
    assert.equal(config.required({ form: { sourceType: "http" } }), false);
    assert.equal(config.required({ form: { sourceType: "s3" } }), true);
    assert.equal(config.component.type({ form: { sourceType: "http" } }), "http");
  });

  for (const sourceType of ["http", "alioss", "tencentcos", "qiniuoss", "s3", "sftp", "ftp"]) {
    it(`复用 ${sourceType} 来源授权和 OssClient 下载`, async () => {
      const { plugin, accesses, access, factoryCalls } = await createPlugin();
      plugin.sourceType = sourceType;
      plugin.accessId = "source-access";
      plugin.crtPath = "/ssl/fullchain.pem";
      plugin.keyPath = "/ssl/privkey.pem";
      await plugin.execute();
      assert.deepEqual(accesses, ["source-access"]);
      assert.equal(factoryCalls[0].type, sourceType);
      assert.equal(factoryCalls[0].opts.access, access);
    });
  }

  it("证书与私钥未变时保留输出，不重复入库或清除下游状态", async () => {
    const cert = createCertificate();
    const { plugin, downloads, events } = await createPlugin(cert);
    plugin.lastStatus = { status: { output: { cert: { ...cert, pfx: "previous-pfx" } } } };
    assert.equal(await plugin.execute(), "skip");
    assert.equal(plugin.cert.pfx, "previous-pfx");
    assert.equal(plugin._result.clearLastStatus, false);
    assert.equal(events.length, 0);
    assert.equal(downloads.length, 2);
    await assertTemporaryFilesRemoved(downloads);
  });

  it("来源证书更新时重新输出并触发部署", async () => {
    const { plugin, events } = await createPlugin(createCertificate("02"));
    plugin.lastStatus = { status: { output: { cert: createCertificate("01") } } };
    await plugin.execute();
    assert.equal(plugin._result.clearLastStatus, true);
    assert.equal(events.length, 1);
  });

  it("输入配置变化时即使证书未变也重新输出", async () => {
    const cert = createCertificate();
    const { plugin, events } = await createPlugin(cert);
    plugin.lastStatus = { status: { output: { cert } } };
    plugin.ctx.inputChanged = true;
    await plugin.execute();
    assert.equal(plugin._result.clearLastStatus, true);
    assert.equal(events.length, 1);
  });

  it("下载失败时传播错误并清理已下载的敏感文件", async () => {
    const error = new Error("下载失败");
    const { plugin, downloads, events } = await createPlugin(createCertificate(), error);
    await assert.rejects(plugin.execute(), error);
    assert.equal(plugin.cert, undefined);
    assert.equal(events.length, 0);
    await assertTemporaryFilesRemoved(downloads);
  });

  for (const cert of [{ crt: "", key: "" }, { crt: "invalid-pem", key: "invalid-key" }, createCertificate("03", true), { ...createCertificate(), key: "invalid-key" }]) {
    it("拒绝空文件、无效证书、过期证书或无效私钥，且不输出", async () => {
      const { plugin, downloads, events } = await createPlugin(cert);
      await assert.rejects(plugin.execute());
      assert.equal(plugin.cert, undefined);
      assert.equal(events.length, 0);
      assert.equal(plugin._result.clearLastStatus, false);
      await assertTemporaryFilesRemoved(downloads);
    });
  }

  it("证书与私钥不匹配时停止部署", async () => {
    const otherKeys = forge.pki.rsa.generateKeyPair(2048);
    const { plugin, events } = await createPlugin({ ...createCertificate(), key: forge.pki.privateKeyToPem(otherKeys.privateKey) });
    await assert.rejects(plugin.execute(), /私钥.*不匹配/);
    assert.equal(events.length, 0);
  });

  for (const input of [{ sourceType: "unknown" }, { sourceType: "" }, { sourceType: "sftp", accessId: "" }, { crtPath: " " }, { keyPath: "" }]) {
    it("配置不完整时在下载前报错", async () => {
      const { plugin, downloads } = await createPlugin();
      Object.assign(plugin, input);
      await assert.rejects(plugin.execute());
      assert.equal(downloads.length, 0);
    });
  }
});
