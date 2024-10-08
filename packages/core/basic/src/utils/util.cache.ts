// LRUCache

import { LRUCache } from "lru-cache";

export const cache = new LRUCache<string, any>({
  max: 1000,
  ttl: 1000 * 60 * 10,
});
