// LRUCache

import { LRUCache } from "lru-cache";

/**
 * 进程内LRU缓存，额外提供同步原子 take。
 * take 在同一进程内通过无await的 get+delete 一次性取走值，调用方不得再使用普通 GET+DELETE 代替。
 * 多实例部署时该原子性仅在单进程内成立；跨进程需共享缓存提供 GETDEL/Lua 等原生原子操作。
 */
export class AtomicLruCache<K extends {}, V extends {}> extends LRUCache<K, V> {
  take(key: K): V | undefined {
    const value = this.get(key);
    if (value !== undefined) {
      this.delete(key);
    }
    return value;
  }
}

export const cache = new AtomicLruCache<string, any>({
  max: 1000,
  ttl: 1000 * 60 * 10,
});

export class LocalCache<V = any> {
  cache: Map<string, { value: V; expiresAt: number }>;
  constructor(opts: { clearInterval?: number } = {}) {
    this.cache = new Map();
    const intervalId = setInterval(
      () => {
        this.clearExpires();
      },
      opts.clearInterval ?? 5 * 60 * 1000
    );
    intervalId.unref?.();
  }

  get(key: string): V | undefined {
    const entry = this.cache.get(key);
    if (!entry) {
      return undefined;
    }

    // 检查是否过期
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return undefined;
    }

    return entry.value;
  }

  set(key: string, value: V, ttl = 300000) {
    // 默认5分钟 (300000毫秒)
    this.cache.set(key, {
      value,
      expiresAt: Date.now() + ttl,
    });
  }

  clear() {
    this.cache.clear();
  }

  clearExpires() {
    for (const [key, entry] of this.cache) {
      if (entry.expiresAt < Date.now()) {
        this.cache.delete(key);
      }
    }
  }
}
