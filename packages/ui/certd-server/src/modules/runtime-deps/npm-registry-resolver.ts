import { Config, Provide, Scope, ScopeEnum } from "@midwayjs/core";

export type NpmRegistryResolverConfig = {
  mode: "auto" | "fixed" | "system";
  fixedUrl: string;
  candidates: string[];
  probeTimeoutMs: number;
  cacheTtlMs: number;
};

export type RegistryProbeResult = {
  registryUrl: string;
  ok: boolean;
  elapsedMs: number;
};

@Provide()
@Scope(ScopeEnum.Singleton)
export class NpmRegistryResolver {
  @Config("runtimeDeps.registry")
  config!: NpmRegistryResolverConfig;

  private cache?: { registryUrl: string; expiresAt: number };

  async resolve(): Promise<string> {
    const config = this.config;
    if (config?.mode === "fixed" && config.fixedUrl) {
      return config.fixedUrl;
    }
    if (config?.mode === "system") {
      return "";
    }

    const cached = this.cache;
    if (cached && cached.expiresAt > Date.now()) {
      return cached.registryUrl;
    }

    const candidates = (config?.candidates || []).filter(Boolean);
    const probes = await Promise.allSettled(candidates.map(registryUrl => this.probe(registryUrl)));
    const okList = probes.map(item => (item.status === "fulfilled" ? item.value : null)).filter((item): item is RegistryProbeResult => !!item && item.ok);

    if (okList.length > 0) {
      okList.sort((a, b) => a.elapsedMs - b.elapsedMs);
      const best = okList[0].registryUrl;
      this.cache = {
        registryUrl: best,
        expiresAt: Date.now() + (config?.cacheTtlMs || 0),
      };
      return best;
    }

    return "";
  }

  async probe(registryUrl: string): Promise<RegistryProbeResult> {
    const timeoutMs = this.config?.probeTimeoutMs || 3000;
    const started = Date.now();
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);
      try {
        const res = await fetch(`${registryUrl.replace(/\/$/, "")}/-/ping`, { signal: controller.signal });
        return {
          registryUrl,
          ok: res.ok,
          elapsedMs: Date.now() - started,
        };
      } finally {
        clearTimeout(timer);
      }
    } catch {
      return {
        registryUrl,
        ok: false,
        elapsedMs: Date.now() - started,
      };
    }
  }
}
