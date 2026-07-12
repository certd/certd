import fs from "fs";
import path from "path";
import { spawn } from "child_process";
import crypto from "crypto";
import { Config, Inject, Provide, Scope, ScopeEnum } from "@midwayjs/core";
import { createRequire } from "module";
import { pathToFileURL } from "url";
import { NpmRegistryResolver } from "./npm-registry-resolver.js";
import { Registry, accessRegistry, notificationRegistry, pluginRegistry } from "@certd/pipeline";
import { dnsProviderRegistry } from "@certd/plugin-lib";
import { addonRegistry } from "@certd/lib-server";
import { logger, ILogger } from "@certd/basic";

export type RuntimeDependencyPluginDefine = {
  name: string;
  key?: string;
  title?: string;
  version?: string;
  pluginType?: string;
  addonType?: string;
  dependPlugins?: Record<string, string>;
  dependPackages?: Record<string, string>;
};

type RegisteredDefineLike = RuntimeDependencyPluginDefine & {
  key?: string;
  pluginType?: string;
  addonType?: string;
  dependPlugins?: Record<string, string>;
  dependPackages?: Record<string, string>;
};

function normalizeRange(range: string) {
  return range.trim().replace(/^\^/, "").replace(/^~?/, "");
}

function areRangesCompatible(a: string, b: string) {
  if (!a || !b) {
    return true;
  }
  if (a === "*" || b === "*") {
    return true;
  }
  const left = normalizeRange(a).split(".");
  const right = normalizeRange(b).split(".");
  return left[0] === right[0];
}

type DependencyConflict = {
  packageName: string;
  ranges: Array<{ pluginName: string; range: string }>;
};

type CollectDependenciesResult = {
  dependencies: Record<string, string>;
  conflicts: DependencyConflict[];
};

type InstallResult = {
  registryUrl: string;
  packageJsonPath: string;
};

type RuntimeImportResolveResult = {
  resolved: string;
  packageName: string;
};

type CommandRunnerResult = {
  stdout: string;
  stderr: string;
  code: number;
};

type CommandRunner = {
  // @ts-ignore
  run(command: string, args: string[], options: { cwd: string; timeoutMs: number; env?: NodeJS.ProcessEnv }): Promise<CommandRunnerResult>;
};

const PROCESS_LOCKS = new Map<string, Promise<unknown>>();

class DefaultCommandRunner implements CommandRunner {
  // @ts-ignore
  async run(command: string, args: string[], options: { cwd: string; timeoutMs: number; env?: NodeJS.ProcessEnv }): Promise<CommandRunnerResult> {
    return await new Promise<CommandRunnerResult>(resolve => {
      let stdout = "";
      let stderr = "";
      let settled = false;
      const child = spawn(command, args, {
        cwd: options.cwd,
        env: options.env,
        windowsHide: true,
        // @ts-ignore
        shell: process.platform === "win32",
      });

      const timer = setTimeout(() => {
        if (settled) {
          return;
        }
        settled = true;
        child.kill("SIGTERM");
        resolve({ stdout, stderr: stderr || `command timeout after ${options.timeoutMs}ms`, code: 1 });
      }, options.timeoutMs);

      child.stdout?.on("data", chunk => {
        stdout += chunk.toString();
      });
      child.stderr?.on("data", chunk => {
        stderr += chunk.toString();
      });
      child.on("error", error => {
        if (settled) {
          return;
        }
        settled = true;
        clearTimeout(timer);
        resolve({ stdout, stderr: error.message, code: 1 });
      });
      child.on("close", code => {
        if (settled) {
          return;
        }
        settled = true;
        clearTimeout(timer);
        resolve({ stdout, stderr, code: code || 0 });
      });
    });
  }
}

@Provide()
@Scope(ScopeEnum.Singleton)
export class RuntimeDepsService {
  @Config("runtimeDeps.rootDir")
  runtimeDepsRootDir = "./data/.runtime-deps";

  @Config("runtimeDeps.autoInstall")
  autoInstall = true;

  @Config("runtimeDeps.enabled")
  enabled = true;

  @Config("runtimeDeps.installTimeoutMs")
  installTimeoutMs = 120000;

  @Config("runtimeDeps.pnpmCommand")
  pnpmCommand = "";

  @Config("runtimeDeps.lazyDependencies")
  lazyDependencies: Record<string, string> = {};

  /**
   * 从插件 registry 收集到的懒加载依赖，键为包名，值为版本范围
   */
  pluginLazyDependencies: Record<string, string> = {};

  @Inject()
  registryResolver!: NpmRegistryResolver;

  commandRunner: CommandRunner = new DefaultCommandRunner();

  private installPromises = new Map<string, Promise<InstallResult>>();

  collectDependencies(plugins: RuntimeDependencyPluginDefine[]): CollectDependenciesResult {
    const merged: Record<string, string> = {};
    const seen: Record<string, Array<{ pluginName: string; range: string }>> = {};

    for (const plugin of plugins) {
      const deps = plugin.dependPackages || {};
      for (const [packageName, range] of Object.entries(deps)) {
        seen[packageName] ||= [];
        seen[packageName].push({ pluginName: plugin.name, range });
      }
    }

    const conflicts: DependencyConflict[] = [];
    for (const [packageName, ranges] of Object.entries(seen)) {
      const first = ranges[0]?.range;
      if (!first) {
        continue;
      }
      const conflict = ranges.some(item => !areRangesCompatible(first, item.range));
      if (conflict) {
        conflicts.push({ packageName, ranges });
        continue;
      }
      merged[packageName] = first;
    }

    return { dependencies: merged, conflicts };
  }

  async ensureInstalled(options: { plugins: RuntimeDependencyPluginDefine[]; logger?: ILogger }): Promise<InstallResult> {
    const { plugins, logger: log } = options;
    const { dependencies, conflicts } = this.resolveDependenciesFromPlugins(plugins);
    if (conflicts.length > 0) {
      const conflict = conflicts[0];
      throw new Error(`动态依赖版本冲突: ${conflict.packageName} => ${conflict.ranges.map(item => `${item.pluginName}:${item.range}`).join(", ")}`);
    }
    return await this.ensureDependencies({ dependencies, logger: log });
  }

  async ensureDependencies(options: { dependencies: Record<string, string>; logger?: ILogger }): Promise<InstallResult> {
    const { dependencies, logger: log } = options;
    if (!this.enabled) {
      return {
        registryUrl: "",
        packageJsonPath: path.join(this.getRuntimeDepsRootDir(), "package.json"),
      };
    }
    if (!this.autoInstall) {
      return {
        registryUrl: "",
        packageJsonPath: path.join(this.getRuntimeDepsRootDir(), "package.json"),
      };
    }
    const dependenciesHash = this.createDependenciesHash(dependencies);
    let installPromise = this.installPromises.get(dependenciesHash);
    if (installPromise) {
      const nodeModulesPath = path.join(this.getRuntimeDepsRootDir(), "node_modules");
      if (!fs.existsSync(nodeModulesPath)) {
        this.installPromises.delete(dependenciesHash);
        installPromise = undefined;
      }
    }
    if (!installPromise) {
      installPromise = this.doEnsureInstalled({ dependencies, logger: log }).catch(error => {
        this.installPromises.delete(dependenciesHash);
        throw error;
      });
      this.installPromises.set(dependenciesHash, installPromise);
    }
    return await installPromise;
  }

  resolveDependenciesFromPlugins(plugins: RuntimeDependencyPluginDefine[]): CollectDependenciesResult {
    const expandedPlugins = plugins.flatMap(plugin => this.resolvePluginDependencies(plugin));
    return this.collectDependencies(expandedPlugins);
  }

  async ensureRuntimeDependencies(options: { pluginKeys: string | string[]; logger?: ILogger }): Promise<InstallResult> {
    const { pluginKeys, logger: log } = options;
    const keys = Array.isArray(pluginKeys) ? pluginKeys : [pluginKeys];
    const pluginDefines = keys.map(pluginKey => this.getDefineByPluginKey(pluginKey));
    if (pluginDefines.every(pluginDefine => !pluginDefine.dependPackages && !pluginDefine.dependPlugins)) {
      return {
        registryUrl: "",
        packageJsonPath: path.join(this.getRuntimeDepsRootDir(), "package.json"),
      };
    }
    const expandedPluginDefines = pluginDefines.flatMap(pluginDefine => this.resolvePluginDependencies(pluginDefine));
    return await this.ensureInstalled({ plugins: expandedPluginDefines, logger: log });
  }

  private async doEnsureInstalled(options: { dependencies: Record<string, string>; logger?: ILogger }): Promise<InstallResult> {
    let { dependencies } = options;
    const log = options.logger || logger;
    return await this.withInstallLock(async () => {
      const rootDir = this.getRuntimeDepsRootDir();
      const packageJsonPath = path.join(rootDir, "package.json");
      const lockPath = path.join(rootDir, "pnpm-lock.yaml");
      log.info(`第三方依赖安装: ${JSON.stringify(dependencies)}`);
      dependencies = this.mergeInstalledDependencies(this.readManifestDependencies(packageJsonPath), dependencies);
      const dependenciesHash = this.createDependenciesHash(dependencies);
      const statePath = path.join(rootDir, "install-state.json");
      const currentState = this.readInstallState(statePath);
      if (currentState?.dependenciesHash === dependenciesHash && fs.existsSync(path.join(rootDir, "node_modules"))) {
        log.info("第三方依赖已安装");
        return { registryUrl: currentState.registryUrl || "", packageJsonPath };
      }
      const manifest = {
        name: "certd-runtime-deps",
        private: true,
        type: "module",
        dependencies,
      };
      fs.writeFileSync(packageJsonPath, JSON.stringify(manifest, null, 2), "utf8");

      const registryUrl = await this.registryResolver.resolve();
      const env = this.buildChildEnv(registryUrl);
      const command = this.getPnpmCommand();
      const pnpmVersion = await this.getPnpmVersion(command, env);
      const args = ["install", "--prod", "--ignore-scripts", "--ignore-workspace", "--no-frozen-lockfile", "--reporter=append-only"];
      if (registryUrl) {
        args.push(`--registry=${registryUrl}`);
      }

      log.info(`开始安装第三方依赖: ${Object.keys(dependencies).join(", ")}`);
      const result = await this.commandRunner.run(command, args, {
        cwd: rootDir,
        timeoutMs: this.installTimeoutMs,
        env,
      });
      if (result.code !== 0) {
        const message = result.stderr || result.stdout || "unknown error";
        this.writeInstallState(statePath, {
          ...currentState,
          installedAt: currentState?.installedAt,
          failedAt: new Date().toISOString(),
          registryUrl,
          dependenciesHash,
          // @ts-ignore
          nodeVersion: process.version,
          pnpmVersion,
          lockFileExists: fs.existsSync(lockPath),
          lastError: message,
        });
        throw new Error(`动态依赖安装失败: ${message}`);
      }
      this.writeInstallState(statePath, {
        installedAt: new Date().toISOString(),
        registryUrl,
        dependenciesHash,
        // @ts-ignore
        nodeVersion: process.version,
        pnpmVersion,
        lockFileExists: fs.existsSync(lockPath),
      });
      log.info("第三方依赖安装完成");
      return { registryUrl, packageJsonPath };
    });
  }

  async importRuntime(specifier: string, logger?: ILogger) {
    if (this.isNativeImportSpecifier(specifier)) {
      return await import(specifier);
    }

    const resolved = await this.resolveImportSpecifier(specifier, logger);
    return await import(pathToFileURL(resolved).href);
  }

  private async resolveImportSpecifier(specifier: string, logger?: ILogger) {
    try {
      return this.resolveRuntimeSpecifier(specifier).resolved;
    } catch (runtimeError: any) {
      if (!this.isModuleNotFoundError(runtimeError)) {
        throw runtimeError;
      }
      return await this.resolveMissingRuntimeSpecifier(specifier, runtimeError, logger);
    }
  }

  private async resolveMissingRuntimeSpecifier(specifier: string, runtimeError: any, logger?: ILogger) {
    const packageName = this.parsePackageName(specifier);
    const mergedDeps = this.getMergedLazyDependencies();
    const lazyRange = mergedDeps[packageName];
    if (!lazyRange) {
      try {
        return this.resolveProjectSpecifier(specifier, runtimeError).resolved;
      } catch {
        throw new Error(`动态依赖未安装且未配置懒加载版本: ${packageName}`);
      }
    }
    try {
      await this.ensureLazyDependency(packageName, logger);
      return this.resolveRuntimeSpecifier(specifier).resolved;
    } catch (lazyError: any) {
      return this.resolveProjectSpecifier(specifier, lazyError).resolved;
    }
  }

  private isNativeImportSpecifier(specifier: string) {
    return specifier.startsWith(".") || specifier.startsWith("/") || specifier.startsWith("file:") || specifier.startsWith("node:");
  }

  private resolveRuntimeSpecifier(specifier: string): RuntimeImportResolveResult {
    const packageName = this.parsePackageName(specifier);
    const packageJsonPath = path.join(this.getRuntimeDepsRootDir(), "package.json");
    const require = createRequire(packageJsonPath);
    const resolved = require.resolve(specifier);
    return { packageName, resolved };
  }

  private resolveProjectSpecifier(specifier: string, cause?: any): RuntimeImportResolveResult {
    try {
      const packageName = this.parsePackageName(specifier);
      const packageJsonPath = path.resolve("package.json");
      const require = createRequire(packageJsonPath);
      const resolved = require.resolve(specifier);
      return { packageName, resolved };
    } catch (projectError: any) {
      if (cause) {
        projectError.cause = cause;
      }
      throw projectError;
    }
  }

  private parsePackageName(specifier: string) {
    if (!specifier || specifier.trim() !== specifier) {
      throw new Error(`动态依赖导入路径无效: ${specifier}`);
    }
    const parts = specifier.split("/");
    if (specifier.startsWith("@")) {
      if (parts.length < 2 || !parts[0] || !parts[1]) {
        throw new Error(`动态依赖导入路径无效: ${specifier}`);
      }
      return `${parts[0]}/${parts[1]}`;
    }
    if (!parts[0]) {
      throw new Error(`动态依赖导入路径无效: ${specifier}`);
    }
    return parts[0];
  }

  private async ensureLazyDependency(packageName: string, logger?: ILogger) {
    const range = this.lazyDependencies?.[packageName];
    if (!range) {
      throw new Error(`动态依赖未安装且未配置懒加载版本: ${packageName}`);
    }
    const dependencies = {
      [packageName]: range,
    };
    await this.ensureDependencies({ dependencies, logger });
  }

  private isModuleNotFoundError(error: any) {
    return error?.code === "MODULE_NOT_FOUND" || error?.code === "ERR_MODULE_NOT_FOUND";
  }

  resolvePluginDependencies(current: RuntimeDependencyPluginDefine): RuntimeDependencyPluginDefine[] {
    const resolved: RuntimeDependencyPluginDefine[] = [];
    const visited = new Set<string>();

    const visit = (item: RuntimeDependencyPluginDefine) => {
      const key = this.buildPluginDependencyKey(item);
      if (visited.has(key)) {
        return;
      }
      visited.add(key);
      resolved.push(item);
      for (const [dependencyName, expectedRange] of Object.entries(item.dependPlugins || {})) {
        const dependency = this.getDefineByPluginKey(dependencyName, item);
        if (!isPluginVersionCompatible(dependency, expectedRange)) {
          throw new Error(`插件依赖版本冲突: ${item.name} 依赖 ${dependencyName}@${expectedRange}，当前版本为 ${dependency.version || "未声明"}`);
        }
        visit(dependency);
      }
    };

    visit(current);
    return resolved;
  }

  private buildPluginDependencyKey(plugin: RuntimeDependencyPluginDefine) {
    if (plugin.pluginType === "addon" && plugin.addonType) {
      return `addon:${plugin.addonType}:${plugin.name}`;
    }
    const pluginType = plugin.pluginType === "deploy" ? "plugin" : plugin.pluginType || "unknown";
    return `${pluginType}:${plugin.name}`;
  }

  private getDefineByPluginKey(pluginKey: string, owner?: RuntimeDependencyPluginDefine): RuntimeDependencyPluginDefine {
    const parts = pluginKey.split(":");
    const [pluginType, subtype, rawName] = parts;
    let name = rawName;
    if (parts.length === 2) {
      name = subtype;
    } else if (parts.length === 3) {
      //无修改
    } else {
      const ownerName = owner?.name || pluginKey;
      throw new Error(`插件依赖格式错误: ${ownerName} 依赖 ${pluginKey}，请使用 plugin:name、access:name、notification:name、dnsProvider:name 或 addon:subtype:name 格式`);
    }
    const registryMap: Record<string, { registry: Registry<any>; key: string; pluginType: string; addonType?: string }> = {
      plugin: { registry: pluginRegistry, key: name, pluginType: "plugin" },
      access: { registry: accessRegistry, key: name, pluginType: "access" },
      notification: { registry: notificationRegistry, key: name, pluginType: "notification" },
      dnsProvider: { registry: dnsProviderRegistry, key: name, pluginType: "dnsProvider" },
      addon: { registry: addonRegistry, key: `${subtype}:${name}`, pluginType: "addon", addonType: subtype },
    };
    const target = registryMap[pluginType];
    if (!target) {
      const ownerName = owner?.name || pluginKey;
      throw new Error(`插件依赖格式错误: ${ownerName} 依赖 ${pluginKey}，未知插件类型 ${pluginType}`);
    }
    const define = target.registry.getDefine(target.key) as RegisteredDefineLike;
    if (!define) {
      throw new Error(`插件依赖缺失: ${owner?.name || pluginKey} 依赖 ${pluginKey}，但该插件未注册或已禁用`);
    }
    return { ...define, key: pluginKey, pluginType: target.pluginType, addonType: target.addonType };
  }

  private async withInstallLock<T>(run: () => Promise<T>): Promise<T> {
    const rootDir = this.getRuntimeDepsRootDir();
    fs.mkdirSync(rootDir, { recursive: true });
    const lockFile = path.join(rootDir, ".install.lock");
    const previous = PROCESS_LOCKS.get(lockFile);
    if (previous) {
      await previous.catch(() => undefined);
    }
    let releaseProcessLock!: () => void;
    const current = new Promise<void>(resolve => {
      releaseProcessLock = resolve;
    });
    PROCESS_LOCKS.set(lockFile, current);
    let fd: number | undefined;
    try {
      fd = await this.acquireFileLock(lockFile);
      return await run();
    } finally {
      if (fd != null) {
        fs.closeSync(fd);
        try {
          fs.rmSync(lockFile, { force: true });
        } catch {
          try {
            fs.rmSync(lockFile, { force: true });
          } catch {
            // Windows 下 closeSync 后文件句柄可能未立即释放，忽略清理失败
          }
        }
      }
      releaseProcessLock();
      if (PROCESS_LOCKS.get(lockFile) === current) {
        PROCESS_LOCKS.delete(lockFile);
      }
    }
  }

  private async acquireFileLock(lockFile: string) {
    const deadline = Date.now() + this.installTimeoutMs;
    while (true) {
      try {
        const fd = fs.openSync(lockFile, "wx");
        // @ts-ignore
        fs.writeFileSync(fd, JSON.stringify({ pid: process.pid, createdAt: new Date().toISOString() }), "utf8");
        return fd;
      } catch (error: any) {
        if (error?.code !== "EEXIST") {
          throw error;
        }
        if (Date.now() > deadline) {
          throw new Error(`动态依赖安装锁等待超时: ${lockFile}`);
        }
        await this.waitForExternalLock(lockFile, deadline);
      }
    }
  }

  private async waitForExternalLock(lockFile: string, deadline: number) {
    while (fs.existsSync(lockFile)) {
      if (Date.now() > deadline) {
        throw new Error(`动态依赖安装锁等待超时: ${lockFile}`);
      }
      await new Promise(resolve => setTimeout(resolve, 300));
    }
  }

  async clearRuntimeDeps() {
    const rootDir = this.getRuntimeDepsRootDir();
    const normalizedRootDir = path.normalize(rootDir);
    if (!normalizedRootDir.endsWith(path.normalize(".runtime-deps"))) {
      throw new Error(`动态依赖目录配置异常，拒绝清理: ${rootDir}`);
    }
    await this.withInstallLock(async () => {
      if (fs.existsSync(rootDir)) {
        const entries = fs.readdirSync(rootDir);
        for (const entry of entries) {
          if (entry === ".install.lock") {
            continue;
          }
          const entryPath = path.join(rootDir, entry);
          fs.rmSync(entryPath, { recursive: true, force: true });
        }
      }
      this.installPromises.clear();
      return undefined;
    });
  }

  /**
   * 合并 package.json 的 lazyDependencies 和插件注册表收集到的 dependPackages
   * 插件依赖优先（同名时使用插件声明的版本）
   */
  getMergedLazyDependencies(): Record<string, string> {
    return { ...this.lazyDependencies, ...this.pluginLazyDependencies };
  }

  /**
   * 从所有插件注册表中收集 dependPackages，合并到 pluginLazyDependencies
   */
  collectPluginDeps() {
    const registries: Array<{ registry: Registry<any>; keyFormatter?: (name: string) => string }> = [
      { registry: pluginRegistry },
      { registry: accessRegistry },
      { registry: notificationRegistry },
      { registry: dnsProviderRegistry },
      { registry: addonRegistry },
    ];

    const deps: Record<string, string> = {};
    for (const { registry } of registries) {
      const defineList = registry.getDefineList();
      for (const define of defineList) {
        const dependPackages = (define as any).dependPackages as Record<string, string> | undefined;
        if (!dependPackages) {
          continue;
        }
        for (const [pkgName, range] of Object.entries(dependPackages)) {
          const existing = deps[pkgName];
          if (existing && !areRangesCompatible(existing, range)) {
            logger.warn(`懒加载依赖版本冲突: ${pkgName} => ${existing} vs ${range}，保留已有版本`);
            continue;
          }
          deps[pkgName] = range;
        }
      }
    }

    this.pluginLazyDependencies = deps;
    logger.info(`从插件注册表收集到 ${Object.keys(deps).length} 个懒加载依赖`);
  }

  /**
   * 刷新插件懒加载依赖：收集所有插件的 dependPackages 到内存列表，实际安装延迟到 importRuntime 时触发
   */
  async refreshPluginDeps() {
    this.collectPluginDeps();
  }

  private readInstallState(statePath: string): any {
    if (!fs.existsSync(statePath)) {
      return null;
    }
    try {
      return JSON.parse(fs.readFileSync(statePath, "utf8"));
    } catch {
      return null;
    }
  }

  private writeInstallState(statePath: string, state: any) {
    fs.writeFileSync(statePath, JSON.stringify(state, null, 2), "utf8");
  }

  private readManifestDependencies(packageJsonPath: string): Record<string, string> {
    if (!fs.existsSync(packageJsonPath)) {
      return {};
    }
    try {
      const manifest = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));
      return manifest.dependencies || {};
    } catch {
      return {};
    }
  }

  private mergeInstalledDependencies(installed: Record<string, string>, requested: Record<string, string>) {
    const dependencies = { ...installed };
    for (const [packageName, range] of Object.entries(requested)) {
      const installedRange = dependencies[packageName];
      if (installedRange && !areRangesCompatible(installedRange, range)) {
        throw new Error(`动态依赖版本冲突: ${packageName} => installed:${installedRange}, requested:${range}`);
      }
      dependencies[packageName] = installedRange || range;
    }
    return dependencies;
  }

  // @ts-ignore
  private async getPnpmVersion(command: string, env: NodeJS.ProcessEnv) {
    const rootDir = this.getRuntimeDepsRootDir();
    const result = await this.commandRunner.run(command, ["--version"], {
      cwd: rootDir,
      timeoutMs: Math.min(this.installTimeoutMs, 10000),
      env,
    });
    if (result.code !== 0) {
      return "";
    }
    return (result.stdout || result.stderr || "").trim();
  }

  private getPnpmCommand() {
    if (this.pnpmCommand) {
      return this.pnpmCommand;
    }
    return "pnpm";
  }

  private buildChildEnv(registryUrl: string) {
    // @ts-ignore
    const env = { ...process.env };
    for (const key of ["NODE_OPTIONS", "VSCODE_INSPECTOR_OPTIONS", "NODE_INSPECTOR_PORT", "NODE_DEBUG"]) {
      if (!env[key]) {
        continue;
      }
      if (key === "NODE_OPTIONS") {
        env[key] = this.stripDebugNodeOptions(env[key] as string);
      } else {
        delete env[key];
      }
    }
    if (registryUrl) {
      env.npm_config_registry = registryUrl;
      env.pnpm_config_registry = registryUrl;
    }
    env.CI = env.CI || "true";
    env.npm_config_confirm_modules_purge = "false";
    env.pnpm_config_confirm_modules_purge = "false";
    return env;
  }

  private stripDebugNodeOptions(value: string) {
    return value
      .split(/\s+/)
      .filter(Boolean)
      .filter(item => !/^--inspect(-brk|-port)?(=|$)/.test(item))
      .filter(item => !/^--debug(=|$)/.test(item))
      .join(" ");
  }

  private getRuntimeDepsRootDir() {
    return path.resolve(this.runtimeDepsRootDir);
  }

  private createDependenciesHash(dependencies: Record<string, string>) {
    return crypto.createHash("sha256").update(JSON.stringify(dependencies)).digest("hex");
  }
}

function isPluginVersionCompatible(plugin: RuntimeDependencyPluginDefine, expectedRange: string) {
  if (!expectedRange || expectedRange === "*") {
    return true;
  }
  if (!plugin.version) {
    return false;
  }
  return areRangesCompatible(expectedRange, plugin.version);
}
