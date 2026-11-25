/**
 * ACME未认证端点（directory/new-nonce/new-account）的按来源IP限速。
 * 这些端点无需账户签名即可访问，是nonce存储耗尽与账户批量注册的滥用入口；
 * 采用固定窗口计数，窗口内超过阈值即拒绝，Map容量受限并定期清理过期窗口，避免内存膨胀。
 */
export class AcmeRateLimiter {
  private windows = new Map<string, { count: number; resetAt: number }>();

  constructor(
    private readonly limit = 60,
    private readonly windowMs = 60 * 1000,
    private readonly maxKeys = 5000,
    private readonly now = () => Date.now()
  ) {}

  private prune(now: number) {
    for (const [key, win] of this.windows) {
      if (win.resetAt <= now) {
        this.windows.delete(key);
      }
    }
    // 仍超容量时按插入顺序淘汰最旧窗口，保证内存上限
    while (this.windows.size > this.maxKeys) {
      const oldest = this.windows.keys().next().value;
      if (oldest == null) {
        break;
      }
      this.windows.delete(oldest);
    }
  }

  /** 返回剩余可用次数；超限返回负数，调用方据此拒绝。 */
  take(key: string): number {
    const now = this.now();
    if (this.windows.size > this.maxKeys) {
      this.prune(now);
    }
    const win = this.windows.get(key);
    if (!win || win.resetAt <= now) {
      this.windows.set(key, { count: 1, resetAt: now + this.windowMs });
      return this.limit - 1;
    }
    win.count += 1;
    return this.limit - win.count;
  }

  retryAfterSeconds(key: string): number {
    const win = this.windows.get(key);
    if (!win) {
      return 0;
    }
    return Math.max(1, Math.ceil((win.resetAt - this.now()) / 1000));
  }
}

export const acmeBootstrapRateLimiter = new AcmeRateLimiter();