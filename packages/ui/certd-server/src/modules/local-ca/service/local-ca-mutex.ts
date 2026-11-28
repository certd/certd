/**
 * 进程内按键异步互斥锁。
 * 本地CA的provider同步（整组替换customAcmeProviders数组）与acmeConfig读改写都是
 * “读取-修改-写回”操作，并发执行会相互覆盖丢失更新；用同一把键锁串行化同一资源的写入。
 * 仅适用于单进程部署（Certd私有化部署为单进程），不跨实例。
 */
export class KeyedAsyncMutex {
  private chains = new Map<string, Promise<unknown>>();

  async runExclusive<T>(key: string, fn: () => Promise<T>): Promise<T> {
    const prev = this.chains.get(key) || Promise.resolve();
    let release!: () => void;
    const gate = new Promise<void>(resolve => {
      release = resolve;
    });
    // 将本次任务接在上一任务之后；无论成功失败都释放，避免死锁
    const current = prev.then(() => gate);
    this.chains.set(key, current);
    await prev.catch(() => undefined);
    try {
      return await fn();
    } finally {
      release();
      // 链尾仍是自己时清理，避免Map无限增长
      if (this.chains.get(key) === current) {
        this.chains.delete(key);
      }
    }
  }
}

export const localCaMutex = new KeyedAsyncMutex();
export const PROVIDER_SYNC_KEY = "local-ca:provider-sync";
export function caConfigKey(caId: number): string {
  return `local-ca:config:${caId}`;
}