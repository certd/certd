import { logger as defaultLogger } from "@certd/basic";
import { spawn } from "child_process";
import fs from "fs";
import { createRequire } from "module";
import path from "path";
import { pathToFileURL } from "url";
import type { Registry } from "../registry/registry.js";
export type ILogger = {
  info: (message: string) => void;
  warn?: (message: string) => void;
  error?: (message: string, ...args: any[]) => void;
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
  run(command: string, args: string[], options: { cwd: string; timeoutMs: number; env?: NodeJS.ProcessEnv }): Promise<CommandRunnerResult>;
};

export type NpmRegistryResolverConfig = {
  mode?: "auto" | "fixed" | "system";
  fixedUrl?: string;
  candidates?: string[];
  probeTimeoutMs?: number;
  cacheTtlMs?: number;
};

export type RegistryProbeResult = {
  registryUrl: string;
  ok: boolean;
  elapsedMs: number;
};

export class NpmRegistryResolver {
  config: NpmRegistryResolverConfig;
  private cache?: { orderedUrls: string[]; expiresAt: number };

  constructor(config?: NpmRegistryResolverConfig) {
    this.config = config || {};
  }

  async resolveOrdered(): Promise<string[]> {
    const config = this.config;
    if (config?.mode === "fixed" && config.fixedUrl) {
      return [config.fixedUrl];
    }
    if (config?.mode === "system") {
      return [];
    }
    const cached = this.cache;
    if (cached && cached.expiresAt > Date.now()) {
      const fastUrl = cached.orderedUrls[0];
      if (fastUrl) {
        const probeResult = await this.probe(fastUrl);
        if (probeResult.ok) {
          return cached.orderedUrls;
        }
      }
      this.cache = undefined;
    }
    const candidates = (config?.candidates || []).filter(Boolean);
    if (candidates.length === 0) {
      return [];
    }
    const orderedUrls = await this.internalProbeAll(candidates);
    this.cache = { orderedUrls, expiresAt: Date.now() + (config?.cacheTtlMs ?? 300_000) };
    return orderedUrls;
  }

  private async internalProbeAll(candidates: string[]): Promise<string[]> {
    const probes = await Promise.allSettled(candidates.map(registryUrl => this.probe(registryUrl)));
    const okList: RegistryProbeResult[] = [];
    const failList: RegistryProbeResult[] = [];
    for (const item of probes) {
      const result = item.status === "fulfilled" ? item.value : null;
      if (result && result.ok) {
        okList.push(result);
      } else if (result) {
        failList.push(result);
      }
    }
    okList.sort((a, b) => a.elapsedMs - b.elapsedMs);
    failList.sort((a, b) => a.elapsedMs - b.elapsedMs);
    return [...okList.map(r => r.registryUrl), ...failList.map(r => r.registryUrl)];
  }

  async probe(registryUrl: string): Promise<RegistryProbeResult> {
    const timeoutMs = this.config?.probeTimeoutMs || 3000;
    const started = Date.now();
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);
      try {
        const res = await fetch(`${registryUrl.replace(/\/$/, "")}/-/ping`, { signal: controller.signal });
        return { registryUrl, ok: res.ok, elapsedMs: Date.now() - started };
      } finally {
        clearTimeout(timer);
      }
    } catch {
      return { registryUrl, ok: false, elapsedMs: Date.now() - started };
    }
  }
}

export type RuntimeDepsConfig = {
  rootDir?: string;
  enabled?: boolean;
  installTimeoutMs?: number;
  pnpmCommand?: string;
  lazyDependencies?: Record<string, string>;
  registry?: NpmRegistryResolverConfig;
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

let INSTALL_LOCKER: any = null;

class DefaultCommandRunner implements CommandRunner {
  async run(command: string, args: string[], options: { cwd: string; timeoutMs: number; env?: NodeJS.ProcessEnv }): Promise<CommandRunnerResult> {
    return await new Promise<CommandRunnerResult>(resolve => {
      let stdout = "";
      let stderr = "";
      let settled = false;
      const child = spawn(command, args, { cwd: options.cwd, env: options.env, windowsHide: true, shell: process.platform === "win32" });
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

export class RuntimeDepsService {
  runtimeDepsRootDir: string;
  enabled: boolean;
  installTimeoutMs: number;
  pnpmCommand: string;
  lazyDependencies: Record<string, string>;
  registryResolver!: NpmRegistryResolver;
  commandRunner: CommandRunner = new DefaultCommandRunner();
  pluginLazyDependencies: Record<string, string> = {};
  private registriesMap: Record<string, { registry: Registry<any>; pluginType: string; addonType?: string }> | null = null;

  constructor(config: RuntimeDepsConfig, registries: any) {
    this.runtimeDepsRootDir = config?.rootDir ?? "./data/.runtime-deps";
    this.enabled = config?.enabled ?? true;
    this.installTimeoutMs = config?.installTimeoutMs ?? 60000;
    this.pnpmCommand = config?.pnpmCommand ?? "";
    this.lazyDependencies = config?.lazyDependencies ?? {};
    this.registryResolver = new NpmRegistryResolver(config?.registry);
    if (registries) {
      this.setRegistries(registries);
    }
  }

  setRegistries(registries: { pluginRegistry?: Registry<any>; accessRegistry?: Registry<any>; notificationRegistry?: Registry<any>; dnsProviderRegistry?: Registry<any>; addonRegistry?: Registry<any> }) {
    const map: Record<string, { registry: Registry<any>; pluginType: string; addonType?: string }> = {};
    if (registries.pluginRegistry) {
      map["plugin"] = { registry: registries.pluginRegistry, pluginType: "plugin" };
    }
    if (registries.accessRegistry) {
      map["access"] = { registry: registries.accessRegistry, pluginType: "access" };
    }
    if (registries.notificationRegistry) {
      map["notification"] = { registry: registries.notificationRegistry, pluginType: "notification" };
    }
    if (registries.dnsProviderRegistry) {
      map["dnsProvider"] = { registry: registries.dnsProviderRegistry, pluginType: "dnsProvider" };
    }
    if (registries.addonRegistry) {
      map["addon"] = { registry: registries.addonRegistry, pluginType: "addon", addonType: "" };
    }
    this.registriesMap = map;
  }

  async ensureDependencies(options: { dependencies: Record<string, string>; logger?: ILogger }): Promise<InstallResult> {
    const { dependencies, logger: log } = options;

    if (INSTALL_LOCKER) {
      throw new Error("动态安装依赖正在执行中，请稍后再试");
    }
    INSTALL_LOCKER = true;
    const installPromise = this.doEnsureInstalled({ dependencies, logger: log }).finally(() => {
      INSTALL_LOCKER = null;
    });
    // 25s 内如果没返回就提前返回
    // AI注意，不要改我的实现，这里提前在25s就报超时是我故意这么做的实现
    // 因为前端配置的超时时间是30s，大部分的情况下install会在25s内完成，所以这里提前在25s就报超时，并且容忍60s的install
    const timeoutPromise: Promise<any> = new Promise((resolve, reject) => setTimeout(() => reject(new Error("安装依赖超时，请稍后重试")), 25 * 1000));
    return await Promise.race([installPromise, timeoutPromise]);
  }

  async importRuntime(specifier: string, logger: ILogger = defaultLogger) {
    if (this.isNativeImportSpecifier(specifier)) {
      //是否本地模块
      return await import(specifier);
    }

    let resolved: string;
    try {
      //尝试加载本项目依赖
      resolved = this.resolveProjectSpecifier(specifier).resolved;
    } catch (error) {
      if (!this.isModuleNotFoundError(error)) {
        throw error;
      }
      resolved = await this.resolveLazyOrInstallSpecifier(specifier, logger);
    }
    if (!resolved) {
      throw new Error(`依赖未安装成功: ${specifier}`);
    }

    return await import(pathToFileURL(resolved).href);
  }

  //动态获取模块解析
  private async resolveLazyOrInstallSpecifier(specifier: string, logger: ILogger = defaultLogger) {
    try {
      //解析动态目录里面的模块是否存在
      return this.resolveRuntimeSpecifier(specifier).resolved;
    } catch (runtimeError: any) {
      if (!this.isModuleNotFoundError(runtimeError)) {
        //其他错误
        throw runtimeError;
      }
      if (!this.enabled) {
        throw new Error("动态安装依赖未开启");
      }
      //模块不存在，安装
      await this.installLazyDependencies(specifier, logger);

      try {
        return this.resolveRuntimeSpecifier(specifier).resolved;
      } catch (lazyError: any) {
        // logger?.error?.(`动态依赖安装失败: ${lazyError.message}`);
        throw new Error(`依赖加载失败，可能动态依赖未安装成功: ${lazyError.message}`, { cause: lazyError });
      }
    }
  }

  //不存在模块动态依赖安装，再获取解析
  private async installLazyDependencies(specifier: string, logger?: ILogger) {
    const packageName = this.parsePackageName(specifier);
    const mergedDeps = this.getMergedLazyDependencies();
    const lazyRange = mergedDeps[packageName];
    if (!lazyRange) {
      throw new Error(`动态依赖未安装且未配置懒加载版本: ${packageName}`);
    }
    try {
      await this.ensureDependencies({ dependencies: { [packageName]: lazyRange }, logger });
    } catch (lazyError: any) {
      // logger?.error?.(`动态依赖安装失败: ${lazyError.message}`);
      throw new Error(`动态依赖安装失败: ${packageName}: ${lazyError.message}`, { cause: lazyError });
    }
  }

  private isNativeImportSpecifier(specifier: string) {
    return specifier.startsWith(".") || specifier.startsWith("/") || specifier.startsWith("file:") || specifier.startsWith("node:");
  }

  //尝试加载runtime依赖
  private resolveRuntimeSpecifier(specifier: string): RuntimeImportResolveResult {
    const packageName = this.parsePackageName(specifier);
    const packageJsonPath = path.join(this.getRuntimeDepsRootDir(), "package.json");
    const require = createRequire(packageJsonPath);
    const resolved = require.resolve(specifier);
    return { packageName, resolved };
  }

  //尝试加载本地依赖
  private resolveProjectSpecifier(specifier: string): RuntimeImportResolveResult {
    const packageName = this.parsePackageName(specifier);
    const packageJsonPath = path.resolve("package.json");
    const require = createRequire(packageJsonPath);
    const resolved = require.resolve(specifier);
    return { packageName, resolved };
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

  private isModuleNotFoundError(error: any) {
    return error?.code === "MODULE_NOT_FOUND" || error?.code === "ERR_MODULE_NOT_FOUND";
  }

  private async doEnsureInstalled(options: { dependencies: Record<string, string>; logger?: ILogger }): Promise<InstallResult> {
    let { dependencies } = options;
    const log = options.logger || defaultLogger;
    const rootDir = this.getRuntimeDepsRootDir();
    if (!fs.existsSync(rootDir)) {
      fs.mkdirSync(rootDir, { recursive: true });
    }
    const packageJsonPath = path.join(rootDir, "package.json");
    log.info(`第三方依赖安装: ${JSON.stringify(dependencies)}`);
    dependencies = this.mergeInstalledDependencies(this.readManifestDependencies(packageJsonPath), dependencies);

    const manifest = { name: "certd-runtime-deps", private: true, type: "module", dependencies };
    fs.writeFileSync(packageJsonPath, JSON.stringify(manifest, null, 2), "utf8");
    const allRegistryUrls = await this.registryResolver.resolveOrdered();
    const urlsToTry = allRegistryUrls.length > 0 ? allRegistryUrls : [""];
    const command = this.getPnpmCommand();
    let lastError: string | undefined;
    for (const tryUrl of urlsToTry) {
      const args = ["install", "--prod", "--ignore-scripts", "--ignore-workspace", "--no-frozen-lockfile", "--reporter=append-only"];
      if (tryUrl) {
        args.push(`--registry=${tryUrl}`);
      }
      const tryEnv = this.buildChildEnv(tryUrl);
      log.info(`开始安装第三方依赖: ${Object.keys(dependencies).join(", ")}${tryUrl ? `，镜像: ${tryUrl}` : ""}`);
      const result = await this.commandRunner.run(command, args, { cwd: rootDir, timeoutMs: this.installTimeoutMs, env: tryEnv });
      if (result.code === 0) {
        log.info(`${result.stdout?.slice(-2000) || "无npm安装日志输出"}`);
        log.info("第三方依赖安装完成");
        return { registryUrl: tryUrl, packageJsonPath };
      }
      const errOutput = (result.stderr || "").trim();
      const outOutput = (result.stdout || "").trim();
      lastError = errOutput || outOutput || "unknown error";
      log.info(`镜像 ${tryUrl || "默认"} 安装失败，退出码: ${result.code}${urlsToTry.length > 1 ? "，尝试下一个镜像..." : ""}`);
      log.info(`  pnpm stderr: ${(errOutput || "无npm安装日志输出").slice(-2000)}`);
      if (outOutput) {
        log.info(`  pnpm stdout: ${outOutput.slice(-2000)}`);
      }
    }
    throw new Error(`动态依赖安装失败: ${lastError}`);
  }

  async clearRuntimeDeps() {
    const rootDir = this.getRuntimeDepsRootDir();
    const normalizedRootDir = path.normalize(rootDir);
    if (!normalizedRootDir.endsWith(path.normalize(".runtime-deps"))) {
      throw new Error(`动态依赖目录配置异常，拒绝清理: ${rootDir}`);
    }

    if (INSTALL_LOCKER) {
      throw new Error("仍有依赖正在安装，请稍后");
    }

    if (fs.existsSync(rootDir)) {
      const entries = fs.readdirSync(rootDir);
      for (const entry of entries) {
        fs.rmSync(path.join(rootDir, entry), { recursive: true, force: true });
      }
    }
  }

  getMergedLazyDependencies(): Record<string, string> {
    return { ...this.lazyDependencies, ...this.pluginLazyDependencies };
  }

  collectPluginDeps(logger?: ILogger) {
    if (!this.registriesMap) {
      return;
    }
    const deps: Record<string, string> = {};
    for (const { registry } of Object.values(this.registriesMap)) {
      const defineList = registry.getDefineList();
      for (const define of defineList) {
        const dependPackages = (define as any).dependPackages as Record<string, string> | undefined;
        if (!dependPackages) {
          continue;
        }
        for (const [pkgName, range] of Object.entries(dependPackages)) {
          const existing = deps[pkgName];
          if (existing && !areRangesCompatible(existing, range)) {
            (logger || defaultLogger).warn?.(`懒加载依赖版本冲突: ${pkgName} => ${existing} vs ${range}，保留已有版本`);
            continue;
          }
          deps[pkgName] = range;
        }
      }
    }
    this.pluginLazyDependencies = deps;
    (logger || defaultLogger).info(`从插件注册表收集到 ${Object.keys(deps).length} 个懒加载依赖`);
  }

  refreshPluginDeps(logger?: ILogger) {
    this.collectPluginDeps(logger);
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

  private getPnpmCommand() {
    return this.pnpmCommand || "pnpm";
  }

  private buildChildEnv(registryUrl: string) {
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

  getRuntimeDepsRootDir() {
    return path.resolve(this.runtimeDepsRootDir);
  }
}

let runtimeDepsServiceInstance: RuntimeDepsService | null = null;

export function initRuntimeDepsService(config: RuntimeDepsConfig, registries: any): RuntimeDepsService {
  runtimeDepsServiceInstance = new RuntimeDepsService(config, registries);
  return runtimeDepsServiceInstance;
}

export function getRuntimeDepsService(): RuntimeDepsService {
  if (!runtimeDepsServiceInstance) {
    throw new Error("RuntimeDepsService 未初始化");
  }
  return runtimeDepsServiceInstance!;
}

export async function importRuntime(specifier: string, logger: ILogger = defaultLogger): Promise<any> {
  return getRuntimeDepsService().importRuntime(specifier, logger);
}
