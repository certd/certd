// LRUCache

import { LRUCache } from "lru-cache";

export const cache = new LRUCache<string, any>({
  max: 1000,
  ttl: 1000 * 60 * 10,
});

export class LocalCache<V = any> {
  cache: Map<string, { value: V; expiresAt: number }>;
  constructor(opts: { clearInterval?: number } = {}) {
    this.cache = new Map();
    const intervalId = setInterval(() => {
      this.clearExpires();
    }, opts.clearInterval ?? 5 * 60 * 1000);
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
