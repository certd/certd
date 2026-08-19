import assert from "assert";
import fs from "fs";
import path from "path";
import os from "os";
import { RuntimeDepsService, NpmRegistryResolver } from "./runtime.js";

describe("RuntimeDepsService", () => {
  it("builds a runtime package manifest in the target directory", async () => {
    const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), "certd-runtime-deps-"));
    const service = new RuntimeDepsService({ rootDir }, null);
    service.registryResolver = {
      async resolveOrdered() {
        return ["https://registry.npmmirror.com"];
      },
    } as any;
    service.commandRunner = {
      async run(command: string, args: string[]) {
        assert.equal(command, "pnpm");
        assert.equal(args[0], "install");
        assert.ok(args.includes("--ignore-workspace"));
        assert.ok(args.includes("--no-frozen-lockfile"));
        return { stdout: "", stderr: "", code: 0 };
      },
    } as any;
    const result = await service.ensureDependencies({ dependencies: { foo: "^1.0.0" } });
    assert.equal(result.registryUrl, "https://registry.npmmirror.com");
    assert.ok(fs.existsSync(path.join(rootDir, "package.json")));
  });

  it("installs direct dependency maps without plugin metadata", async () => {
    const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), "certd-runtime-deps-direct-"));
    const service = new RuntimeDepsService({ rootDir }, null);
    service.registryResolver = {
      async resolveOrdered() {
        return [""];
      },
    } as any;
    service.commandRunner = {
      async run(command: string, args: string[]) {
        assert.equal(command, "pnpm");
        fs.mkdirSync(path.join(rootDir, "node_modules"), { recursive: true });
        return { stdout: "", stderr: "", code: 0 };
      },
    } as any;
    await service.ensureDependencies({ dependencies: { directPkg: "^1.0.0" } });
    const manifest = JSON.parse(fs.readFileSync(path.join(rootDir, "package.json"), "utf8"));
    assert.deepEqual(manifest.dependencies, { directPkg: "^1.0.0" });
  });

  it("imports from runtime node_modules without installing", async () => {
    const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), "certd-runtime-deps-import-"));
    const packageDir = path.join(rootDir, "node_modules", "runtime-only");
    fs.mkdirSync(packageDir, { recursive: true });
    fs.writeFileSync(path.join(rootDir, "package.json"), JSON.stringify({ name: "runtime-root", type: "module" }), "utf8");
    fs.writeFileSync(path.join(packageDir, "package.json"), JSON.stringify({ name: "runtime-only", type: "module", main: "index.js" }), "utf8");
    fs.writeFileSync(path.join(packageDir, "index.js"), "export const value = 42;\n", "utf8");
    const service = new RuntimeDepsService({ rootDir }, null);
    service.commandRunner = {
      async run() {
        throw new Error("install should not run");
      },
    } as any;
    const mod = await service.importRuntime("runtime-only");
    assert.equal(mod.value, 42);
  });

  it("installs configured lazy dependency when import target is missing", async () => {
    const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), "certd-runtime-deps-lazy-"));
    const service = new RuntimeDepsService({ rootDir, lazyDependencies: { "lazy-pkg": "^1.2.3" } }, null);
    service.registryResolver = {
      async resolveOrdered() {
        return [""];
      },
    } as any;
    service.commandRunner = {
      async run(command: string, args: string[]) {
        assert.equal(command, "pnpm");
        const packageDir = path.join(rootDir, "node_modules", "lazy-pkg", "sub");
        fs.mkdirSync(packageDir, { recursive: true });
        fs.writeFileSync(path.join(rootDir, "node_modules", "lazy-pkg", "package.json"), JSON.stringify({ name: "lazy-pkg", type: "module" }), "utf8");
        fs.writeFileSync(path.join(packageDir, "entry.js"), "export const value = 7;\n", "utf8");
        return { stdout: "", stderr: "", code: 0 };
      },
    } as any;
    const mod = await service.importRuntime("lazy-pkg/sub/entry.js");
    const manifest = JSON.parse(fs.readFileSync(path.join(rootDir, "package.json"), "utf8"));
    assert.deepEqual(manifest.dependencies, { "lazy-pkg": "^1.2.3" });
    assert.equal(mod.value, 7);
  });

  it("reports lazy dependency installation failure without falling back to project dependencies", async () => {
    const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), "certd-runtime-deps-lazy-failed-"));
    const service = new RuntimeDepsService({ rootDir, lazyDependencies: { "failed-pkg": "^1.2.3" } }, null);
    service.registryResolver = {
      async resolveOrdered() {
        return [""];
      },
    } as any;
    service.commandRunner = {
      async run(command: string, args: string[]) {
        assert.equal(command, "pnpm");
        return { stdout: "", stderr: "package download failed", code: 1 };
      },
    } as any;

    await assert.rejects(() => service.importRuntime("failed-pkg/sub/entry.js"), /动态依赖安装失败: failed-pkg: 动态依赖安装失败: package download failed/);
  });

  it("resolves scoped package names for lazy imports", async () => {
    const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), "certd-runtime-deps-scoped-"));
    const service = new RuntimeDepsService({ rootDir, lazyDependencies: { "@scope/lazy": "^2.0.0" } }, null);
    service.registryResolver = {
      async resolveOrdered() {
        return [""];
      },
    } as any;
    service.commandRunner = {
      async run(command: string, args: string[]) {
        assert.equal(command, "pnpm");
        const packageDir = path.join(rootDir, "node_modules", "@scope", "lazy", "dist");
        fs.mkdirSync(packageDir, { recursive: true });
        fs.writeFileSync(path.join(rootDir, "node_modules", "@scope", "lazy", "package.json"), JSON.stringify({ name: "@scope/lazy", type: "module" }), "utf8");
        fs.writeFileSync(path.join(packageDir, "index.js"), "export const scoped = true;\n", "utf8");
        return { stdout: "", stderr: "", code: 0 };
      },
    } as any;
    const mod = await service.importRuntime("@scope/lazy/dist/index.js");
    const manifest = JSON.parse(fs.readFileSync(path.join(rootDir, "package.json"), "utf8"));
    assert.deepEqual(manifest.dependencies, { "@scope/lazy": "^2.0.0" });
    assert.equal(mod.scoped, true);
  });

  it("reports missing lazy dependency configuration", async () => {
    const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), "certd-runtime-deps-lazy-missing-"));
    const service = new RuntimeDepsService({ rootDir, lazyDependencies: {} }, null);
    await assert.rejects(() => service.importRuntime("missing-pkg/sub.js"), /未配置懒加载版本: missing-pkg/);
  });

  it("rejects lazy dependency installation when disabled", async () => {
    const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), "certd-runtime-deps-disabled-"));
    const service = new RuntimeDepsService({ rootDir, enabled: false, lazyDependencies: { "lazy-pkg": "^1.0.0" } }, null);
    service.commandRunner = {
      async run() {
        throw new Error("disabled runtime dependencies should not install packages");
      },
    } as any;

    await assert.rejects(() => service.importRuntime("lazy-pkg/index.js"), /动态安装依赖未开启/);
  });

  it("prefers project dependencies over lazy dependency installation", async () => {
    const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), "certd-runtime-deps-project-fallback-"));
    const service = new RuntimeDepsService({ rootDir, lazyDependencies: { dayjs: "^1.11.0" } }, null);
    service.commandRunner = {
      async run() {
        throw new Error("project dependency should not trigger installation");
      },
    } as any;
    const mod = await service.importRuntime("dayjs");
    assert.equal(typeof mod.default, "function");
  });

  it("rejects a second installation while the first installation is running", async () => {
    const rootDir = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "certd-runtime-deps-concurrent-")), ".runtime-deps");
    const service = new RuntimeDepsService({ rootDir }, null);
    service.registryResolver = {
      async resolveOrdered() {
        return [""];
      },
    } as any;

    let finishInstall: () => void;
    const installFinished = new Promise<void>(resolve => {
      finishInstall = resolve;
    });
    service.commandRunner = {
      async run() {
        await installFinished;
        return { stdout: "", stderr: "", code: 0 };
      },
    } as any;

    const firstInstall = service.ensureDependencies({ dependencies: { first: "^1.0.0" } });
    await new Promise(resolve => setImmediate(resolve));
    await assert.rejects(() => service.ensureDependencies({ dependencies: { second: "^1.0.0" } }), /动态安装依赖正在执行中/);
    await assert.rejects(() => service.clearRuntimeDeps(), /仍有依赖正在安装/);
    finishInstall!();
    await firstInstall;
  });

  it("releases the installation lock after an installation failure", async () => {
    const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), "certd-runtime-deps-retry-"));
    const service = new RuntimeDepsService({ rootDir }, null);
    service.registryResolver = {
      async resolveOrdered() {
        return [""];
      },
    } as any;

    let installCount = 0;
    service.commandRunner = {
      async run() {
        installCount += 1;
        if (installCount === 1) {
          return { stdout: "", stderr: "installation timeout", code: 1 };
        }
        return { stdout: "", stderr: "", code: 0 };
      },
    } as any;

    await assert.rejects(() => service.ensureDependencies({ dependencies: { first: "^1.0.0" } }), /动态依赖安装失败/);
    await service.ensureDependencies({ dependencies: { second: "^1.0.0" } });
    assert.equal(installCount, 2);
  });

  it("keeps previously installed dependencies when adding a later package", async () => {
    const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), "certd-runtime-deps-merge-"));
    const service = new RuntimeDepsService({ rootDir }, null);
    service.registryResolver = {
      async resolveOrdered() {
        return [""];
      },
    } as any;
    service.commandRunner = {
      async run(command: string, args: string[]) {
        assert.equal(command, "pnpm");
        if (args.includes("--version")) {
          return { stdout: "9.1.0\n", stderr: "", code: 0 };
        }
        fs.mkdirSync(path.join(rootDir, "node_modules"), { recursive: true });
        return { stdout: "", stderr: "", code: 0 };
      },
    } as any;
    await service.ensureDependencies({ dependencies: { foo: "^1.0.0" } });
    await service.ensureDependencies({ dependencies: { bar: "^2.0.0" } });
    const manifest = JSON.parse(fs.readFileSync(path.join(rootDir, "package.json"), "utf8"));
    assert.deepEqual(manifest.dependencies, { foo: "^1.0.0", bar: "^2.0.0" });
  });

  it("does not pass node debugger options to pnpm child process", async () => {
    const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), "certd-runtime-deps-env-"));
    const oldNodeOptions = process.env.NODE_OPTIONS;
    const oldInspectorOptions = process.env.VSCODE_INSPECTOR_OPTIONS;
    process.env.NODE_OPTIONS = "--inspect=127.0.0.1:9229 --max-old-space-size=4096";
    process.env.VSCODE_INSPECTOR_OPTIONS = '{"inspectorIpc":"test"}';
    try {
      const service = new RuntimeDepsService({ rootDir }, null);
      service.registryResolver = {
        async resolveOrdered() {
          return [""];
        },
      } as any;
      service.commandRunner = {
        async run(command: string, args: string[], options: { env?: NodeJS.ProcessEnv }) {
          assert.equal(options.env?.NODE_OPTIONS, "--max-old-space-size=4096");
          assert.equal(options.env?.VSCODE_INSPECTOR_OPTIONS, undefined);
          assert.equal(options.env?.CI, "true");
          assert.equal(options.env?.pnpm_config_confirm_modules_purge, "false");
          return { stdout: "", stderr: "", code: 0 };
        },
      } as any;
      await service.ensureDependencies({ dependencies: { foo: "^1.0.0" } });
    } finally {
      if (oldNodeOptions == null) {
        delete process.env.NODE_OPTIONS;
      } else {
        process.env.NODE_OPTIONS = oldNodeOptions;
      }
      if (oldInspectorOptions == null) {
        delete process.env.VSCODE_INSPECTOR_OPTIONS;
      } else {
        process.env.VSCODE_INSPECTOR_OPTIONS = oldInspectorOptions;
      }
    }
  });

  it("rejects clearing unexpected runtime dependency path", async () => {
    const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), "certd-runtime-clear-invalid-"));
    const service = new RuntimeDepsService({ rootDir }, null);
    await assert.rejects(() => service.clearRuntimeDeps(), /动态依赖目录配置异常/);
  });
});

describe("NpmRegistryResolver", () => {
  it("uses fixed registry without probing", async () => {
    const resolver = new NpmRegistryResolver({
      mode: "fixed",
      fixedUrl: "https://registry.example.com",
      probeTimeoutMs: 100,
      cacheTtlMs: 1000,
    });
    const result = await resolver.resolveOrdered();
    assert.deepEqual(result, ["https://registry.example.com"]);
  });
  it("returns ordered list via resolveOrdered (fastest first)", async () => {
    const resolver = new NpmRegistryResolver({
      mode: "auto",
      candidates: ["https://slow.example.com", "https://fast.example.com"],
      probeTimeoutMs: 100,
      cacheTtlMs: 1000,
    });
    resolver.probe = async (registryUrl: string) => ({
      registryUrl,
      ok: true,
      elapsedMs: registryUrl.includes("fast") ? 10 : 50,
    });
    const result = await resolver.resolveOrdered();
    assert.deepEqual(result, ["https://fast.example.com", "https://slow.example.com"]);
  });
  it("includes failed registries at the end of resolveOrdered", async () => {
    const resolver = new NpmRegistryResolver({
      mode: "auto",
      candidates: ["https://good.example.com", "https://bad.example.com"],
      probeTimeoutMs: 100,
      cacheTtlMs: 1000,
    });
    resolver.probe = async (registryUrl: string) => {
      if (registryUrl.includes("bad")) {
        return { registryUrl, ok: false, elapsedMs: 200 };
      }
      return { registryUrl, ok: true, elapsedMs: 30 };
    };
    const result = await resolver.resolveOrdered();
    assert.deepEqual(result, ["https://good.example.com", "https://bad.example.com"]);
  });
  it("returns empty ordered list when no candidates", async () => {
    const resolver = new NpmRegistryResolver({ mode: "auto", candidates: [] });
    const result = await resolver.resolveOrdered();
    assert.deepEqual(result, []);
  });
  it("re-validates cached URL on resolveOrdered call", async () => {
    let probeCount = 0;
    const resolver = new NpmRegistryResolver({
      mode: "auto",
      candidates: ["https://mirror.example.com"],
      cacheTtlMs: 60000,
    });
    resolver.probe = async (registryUrl: string) => {
      probeCount++;
      return { registryUrl, ok: true, elapsedMs: 10 };
    };
    const first = await resolver.resolveOrdered();
    assert.deepEqual(first, ["https://mirror.example.com"]);
    assert.equal(probeCount, 1);
    const second = await resolver.resolveOrdered();
    assert.deepEqual(second, ["https://mirror.example.com"]);
    assert.equal(probeCount, 2);
  });
});
