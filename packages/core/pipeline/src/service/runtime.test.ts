import assert from "assert";
import fs from "fs";
import path from "path";
import os from "os";
import { RuntimeDepsService, NpmRegistryResolver, type RuntimeDependencyPluginDefine } from "./runtime.js";
import { accessRegistry } from "../access/registry.js";
import { pluginRegistry } from "../plugin/registry.js";

describe("RuntimeDepsService", () => {
  it("detects conflicting dependency ranges across plugins", () => {
    const service = new RuntimeDepsService({}, null);
    const merged = service.collectDependencies([
      { name: "a", dependPackages: { foo: "^1.0.0" } },
      { name: "b", dependPackages: { foo: "^1.2.0" } },
    ]);
    assert.deepEqual(merged.dependencies, { foo: "^1.0.0" });
    assert.equal(merged.conflicts.length, 0);
  });

  it("reports incompatible dependency ranges", () => {
    const service = new RuntimeDepsService({}, null);
    const merged = service.collectDependencies([
      { name: "a", dependPackages: { foo: "^1.0.0" } },
      { name: "b", dependPackages: { foo: "^2.0.0" } },
    ]);
    assert.equal(merged.conflicts.length, 1);
    assert.equal(merged.conflicts[0].packageName, "foo");
  });

  it("builds a runtime package manifest in the target directory", async () => {
    const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), "certd-runtime-deps-"));
    const service = new RuntimeDepsService({ rootDir }, null);
    service.registryResolver = {
      async resolve() {
        return "https://registry.npmmirror.com";
      },
    } as any;
    service.commandRunner = {
      async run(command: string, args: string[]) {
        assert.equal(command, "pnpm");
        if (args.includes("--version")) {
          return { stdout: "9.1.0\n", stderr: "", code: 0 };
        }
        assert.equal(args[0], "install");
        assert.ok(args.includes("--ignore-workspace"));
        assert.ok(args.includes("--no-frozen-lockfile"));
        return { stdout: "", stderr: "", code: 0 };
      },
    } as any;
    const plugins: RuntimeDependencyPluginDefine[] = [{ name: "a", dependPackages: { foo: "^1.0.0" } }];
    const result = await service.ensureInstalled({ plugins });
    assert.equal(result.registryUrl, "https://registry.npmmirror.com");
    assert.ok(fs.existsSync(path.join(rootDir, "package.json")));
  });

  it("installs direct dependency maps without plugin metadata", async () => {
    const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), "certd-runtime-deps-direct-"));
    const service = new RuntimeDepsService({ rootDir }, null);
    service.registryResolver = {
      async resolve() {
        return "";
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
      async resolve() {
        return "";
      },
    } as any;
    service.commandRunner = {
      async run(command: string, args: string[]) {
        assert.equal(command, "pnpm");
        if (args.includes("--version")) {
          return { stdout: "9.1.0\n", stderr: "", code: 0 };
        }
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

  it("resolves scoped package names for lazy imports", async () => {
    const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), "certd-runtime-deps-scoped-"));
    const service = new RuntimeDepsService({ rootDir, lazyDependencies: { "@scope/lazy": "^2.0.0" } }, null);
    service.registryResolver = {
      async resolve() {
        return "";
      },
    } as any;
    service.commandRunner = {
      async run(command: string, args: string[]) {
        assert.equal(command, "pnpm");
        if (args.includes("--version")) {
          return { stdout: "9.1.0\n", stderr: "", code: 0 };
        }
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

  it("falls back to project node_modules when lazy dependency is not configured", async () => {
    const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), "certd-runtime-deps-project-fallback-"));
    const service = new RuntimeDepsService({ rootDir, lazyDependencies: {} }, null);
    const mod = await service.importRuntime("dayjs");
    assert.equal(typeof mod.default, "function");
  });

  it("keeps previously installed dependencies when installing a later plugin", async () => {
    const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), "certd-runtime-deps-merge-"));
    const service = new RuntimeDepsService({ rootDir }, null);
    service.registryResolver = {
      async resolve() {
        return "";
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
    await service.ensureInstalled({ plugins: [{ name: "a", pluginType: "deploy", dependPackages: { foo: "^1.0.0" } }] });
    await service.ensureInstalled({ plugins: [{ name: "b", pluginType: "deploy", dependPackages: { bar: "^2.0.0" } }] });
    const manifest = JSON.parse(fs.readFileSync(path.join(rootDir, "package.json"), "utf8"));
    assert.deepEqual(manifest.dependencies, { foo: "^1.0.0", bar: "^2.0.0" });
  });

  it("includes npm dependencies from dependent plugins", async () => {
    const service = new RuntimeDepsService({}, { accessRegistry, pluginRegistry });
    accessRegistry.register("runtimeDepsAccess", {
      define: { name: "runtimeDepsAccess", title: "access", dependPackages: { accessOnly: "^1.0.0" } } as any,
      target: async () => ({}) as any,
    });
    try {
      const resolved = service.resolvePluginDependencies({
        name: "deploy",
        pluginType: "deploy",
        dependPlugins: { "access:runtimeDepsAccess": "*" },
        dependPackages: { deployOnly: "^1.0.0" },
      });
      const merged = service.collectDependencies(resolved);
      assert.deepEqual(merged.dependencies, { deployOnly: "^1.0.0", accessOnly: "^1.0.0" });
    } finally {
      accessRegistry.unRegister("runtimeDepsAccess");
    }
  });

  it("installs dependencies by registered plugin key", async () => {
    const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), "certd-runtime-deps-key-"));
    const service = new RuntimeDepsService({ rootDir }, { pluginRegistry, accessRegistry });
    service.registryResolver = {
      async resolve() {
        return "";
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
    pluginRegistry.register("runtimeDepsKey", {
      define: { name: "runtimeDepsKey", title: "key", dependPackages: { keyed: "^1.0.0" } } as any,
      target: async () => ({}) as any,
    });
    try {
      service.setRegistries({ pluginRegistry, accessRegistry });
      await service.ensureRuntimeDependencies({ pluginKeys: "plugin:runtimeDepsKey" });
      const manifest = JSON.parse(fs.readFileSync(path.join(rootDir, "package.json"), "utf8"));
      assert.deepEqual(manifest.dependencies, { keyed: "^1.0.0" });
    } finally {
      pluginRegistry.unRegister("runtimeDepsKey");
    }
  });

  it("reports missing dependent plugins", () => {
    const service = new RuntimeDepsService({}, { accessRegistry, pluginRegistry });
    assert.throws(() => service.resolvePluginDependencies({ name: "deploy", pluginType: "deploy", dependPlugins: { "access:access": "*" } }), /插件依赖缺失/);
  });

  it("reports incompatible dependent plugin versions", () => {
    const service = new RuntimeDepsService({}, { accessRegistry, pluginRegistry });
    accessRegistry.register("runtimeDepsVersionedAccess", {
      define: { name: "runtimeDepsVersionedAccess", title: "access", version: "1.4.0", dependPackages: { accessOnly: "^1.0.0" } } as any,
      target: async () => ({}) as any,
    });
    try {
      assert.throws(
        () =>
          service.resolvePluginDependencies({
            name: "deploy",
            pluginType: "deploy",
            dependPlugins: { "access:runtimeDepsVersionedAccess": "^2.0.0" },
          }),
        /插件依赖版本冲突/
      );
    } finally {
      accessRegistry.unRegister("runtimeDepsVersionedAccess");
    }
  });

  it("reports bare dependent plugin names as invalid format", () => {
    const service = new RuntimeDepsService({}, null);
    assert.throws(() => service.resolvePluginDependencies({ name: "deploy", pluginType: "deploy", dependPlugins: { runtimeDepsBareName: "*" } }), /插件依赖格式错误/);
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
        async resolve() {
          return "";
        },
      } as any;
      service.commandRunner = {
        async run(command: string, args: string[], options: { env?: NodeJS.ProcessEnv }) {
          assert.equal(options.env?.NODE_OPTIONS, "--max-old-space-size=4096");
          assert.equal(options.env?.VSCODE_INSPECTOR_OPTIONS, undefined);
          assert.equal(options.env?.CI, "true");
          assert.equal(options.env?.pnpm_config_confirm_modules_purge, "false");
          if (args.includes("--version")) {
            return { stdout: "9.1.0\n", stderr: "", code: 0 };
          }
          return { stdout: "", stderr: "", code: 0 };
        },
      } as any;
      await service.ensureInstalled({ plugins: [{ name: "a", dependPackages: { foo: "^1.0.0" } }] });
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
  it("chooses the fastest successful registry in auto mode", async () => {
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
    const result = await resolver.resolve();
    assert.equal(result, "https://fast.example.com");
  });

  it("uses fixed registry without probing", async () => {
    const resolver = new NpmRegistryResolver({
      mode: "fixed",
      fixedUrl: "https://registry.example.com",
      probeTimeoutMs: 100,
      cacheTtlMs: 1000,
    });
    const result = await resolver.resolve();
    assert.equal(result, "https://registry.example.com");
  });
});
