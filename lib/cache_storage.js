/**
 * HTTP Cache and In-Memory Storage Layer.
 * Supports Cache-Control headers, ETags, and Stale-While-Revalidate pattern.
 */

class CacheEntry {
  constructor(key, response, ttlMs, etag = null) {
    this.key = key;
    this.body = response.body;
    this.headers = response.headers || {};
    this.status = response.status || 200;
    this.createdAt = Date.now();
    this.expiresAt = this.createdAt + ttlMs;
    this.etag = etag;
    this.lastAccessed = Date.now();
  }

  isExpired() {
    return Date.now() > this.expiresAt;
  }

  isStale(staleToleranceMs = 0) {
    return Date.now() > this.expiresAt + staleToleranceMs;
  }
}

class LruHttpCache {
  /**
   * Least-Recently-Used HTTP response cache.
   * @param {Object} options
   * @param {number} options.maxEntries - Maximum number of cached responses (default: 500)
   * @param {number} options.defaultTtlMs - Default TTL in ms (default: 60000)
   */
  constructor(options = {}) {
    this.maxEntries = options.maxEntries || 500;
    this.defaultTtlMs = options.defaultTtlMs || 60000;
    this.cache = new Map();
    this.hits = 0;
    this.misses = 0;
  }

  _parseCacheControl(headers = {}) {
    const cc = headers["cache-control"] || headers["Cache-Control"] || "";
    const directives = {};
    cc.split(",").forEach((part) => {
      const [key, val] = part.trim().split("=");
      directives[key.toLowerCase()] = val !== undefined ? parseInt(val, 10) : true;
    });
    return directives;
  }

  get(url, options = {}) {
    const entry = this.cache.get(url);
    if (!entry) {
      this.misses++;
      return null;
    }

    entry.lastAccessed = Date.now();
    // Reorder in Map to maintain LRU order
    this.cache.delete(url);
    this.cache.set(url, entry);

    if (entry.isExpired()) {
      if (options.allowStale && !entry.isStale(options.staleToleranceMs || 30000)) {
        this.hits++;
        return { entry, stale: true };
      }
      this.cache.delete(url);
      this.misses++;
      return null;
    }

    this.hits++;
    return { entry, stale: false };
  }

  put(url, response, customTtlMs = null) {
    const headers = response.headers || {};
    const cc = this._parseCacheControl(headers);

    if (cc["no-store"]) {
      return false;
    }

    let ttl = customTtlMs || this.defaultTtlMs;
    if (cc["max-age"] !== undefined) {
      ttl = cc["max-age"] * 1000;
    }

    const etag = headers["etag"] || headers["ETag"] || null;
    const entry = new CacheEntry(url, response, ttl, etag);

    if (this.cache.size >= this.maxEntries) {
      const oldestKey = this.cache.keys().next().value;
      this.cache.delete(oldestKey);
    }

    this.cache.set(url, entry);
    return true;
  }

  invalidate(url) {
    return this.cache.delete(url);
  }

  clear() {
    this.cache.clear();
    this.hits = 0;
    this.misses = 0;
  }

  getStats() {
    const total = this.hits + this.misses;
    return {
      size: this.cache.size,
      maxEntries: this.maxEntries,
      hits: this.hits,
      misses: this.misses,
      hitRatio: total > 0 ? (this.hits / total).toFixed(4) : "0.0000"
    };
  }
}

module.exports = {
  CacheEntry,
  LruHttpCache
};
