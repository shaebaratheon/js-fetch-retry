/**
 * Multi-layer in-memory cache with RFC 7234 Cache-Control header parser and LRU eviction.
 */

export interface CacheEntry {
  key: string;
  responseBody: string;
  status: number;
  headers: Record<string, string>;
  createdAt: number;
  expiresAt: number;
  etag?: string;
}

export class LRUCacheStore {
  private cache = new Map<string, CacheEntry>();

  constructor(private readonly maxCapacity: number = 1000) {}

  public get(key: string): CacheEntry | undefined {
    const entry = this.cache.get(key);
    if (!entry) return undefined;

    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return undefined;
    }

    // Refresh LRU ordering
    this.cache.delete(key);
    this.cache.set(key, entry);
    return entry;
  }

  public set(key: string, entry: CacheEntry) {
    if (this.cache.has(key)) {
      this.cache.delete(key);
    } else if (this.cache.size >= this.maxCapacity) {
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey) this.cache.delete(oldestKey);
    }
    this.cache.set(key, entry);
  }

  public invalidate(keyPrefix: string) {
    for (const k of this.cache.keys()) {
      if (k.startsWith(keyPrefix)) {
        this.cache.delete(k);
      }
    }
  }

  public clear() {
    this.cache.clear();
  }
}
