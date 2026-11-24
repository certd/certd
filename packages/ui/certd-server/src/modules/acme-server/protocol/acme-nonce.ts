import crypto from "node:crypto";

export class AcmeNonceStore {
  private nonces = new Map<string, number>();

  constructor(
    private readonly maxSize = 10000,
    private readonly ttl = 5 * 60 * 1000,
    private readonly now = () => Date.now()
  ) {}

  private pruneExpired(now: number) {
    // Map 保持插入顺序，TTL 固定，过期项集中在头部，避免每次全量遍历
    for (const [nonce, expires] of this.nonces) {
      if (expires > now) {
        break;
      }
      this.nonces.delete(nonce);
    }
  }

  create() {
    const now = this.now();
    this.pruneExpired(now);
    while (this.nonces.size >= this.maxSize) {
      const oldest = this.nonces.keys().next().value;
      if (oldest == null) {
        break;
      }
      this.nonces.delete(oldest);
    }
    const nonce = crypto.randomBytes(16).toString("base64url");
    this.nonces.set(nonce, now + this.ttl);
    return nonce;
  }

  consume(nonce: string) {
    const expires = this.nonces.get(nonce);
    if (!expires || expires <= this.now()) {
      this.nonces.delete(nonce);
      return false;
    }
    this.nonces.delete(nonce);
    return true;
  }

  get size() {
    return this.nonces.size;
  }
}

export const acmeNonceStore = new AcmeNonceStore();
