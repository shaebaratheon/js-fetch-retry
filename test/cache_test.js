/**
 * Unit Tests for HTTP Cache Storage and Connection Management.
 */

const assert = require("assert");
const { LruHttpCache } = require("../lib/cache_storage");
const { ConnectionPoolManager, TimeoutController } = require("../lib/http_agent");

async function runCacheTests() {
  console.log("Running Cache & Agent unit tests...");

  // Test 1: LRU eviction
  {
    const cache = new LruHttpCache({ maxEntries: 2, defaultTtlMs: 10000 });
    cache.put("https://api.test/1", { body: "res1", status: 200 });
    cache.put("https://api.test/2", { body: "res2", status: 200 });
    assert.strictEqual(cache.cache.size, 2);

    // Access key 1 to make key 2 the least recently used
    cache.get("https://api.test/1");

    // Insert 3rd entry
    cache.put("https://api.test/3", { body: "res3", status: 200 });
    assert.strictEqual(cache.get("https://api.test/2"), null);
    assert.notStrictEqual(cache.get("https://api.test/1"), null);
    console.log("  [PASS] LRU eviction order");
  }

  // Test 2: Cache-Control max-age header parsing
  {
    const cache = new LruHttpCache({ maxEntries: 10, defaultTtlMs: 500 });
    cache.put("https://api.test/ttl", {
      body: "short_lived",
      headers: { "cache-control": "max-age=1" }
    });

    const hit = cache.get("https://api.test/ttl");
    assert.strictEqual(hit.entry.body, "short_lived");
    assert.strictEqual(hit.stale, false);
    console.log("  [PASS] Cache-Control max-age TTL");
  }

  // Test 3: Connection Pool
  {
    const pool = new ConnectionPoolManager({ maxSockets: 2 });
    const sock1 = pool.acquireSocket("https://api.test");
    const sock2 = pool.acquireSocket("https://api.test");
    const sock3 = pool.acquireSocket("https://api.test");
    assert(sock1 !== null);
    assert(sock2 !== null);
    assert.strictEqual(sock3, null); // max capacity

    pool.releaseSocket("https://api.test", sock1);
    const reused = pool.acquireSocket("https://api.test");
    assert.strictEqual(reused.id, sock1.id);
    console.log("  [PASS] Connection pool socket recycling");
  }

  // Test 4: Timeout controller
  {
    const { signal, cancel } = TimeoutController.create(100);
    assert.strictEqual(signal.aborted, false);
    cancel();
    assert.strictEqual(signal.aborted, false);
    console.log("  [PASS] TimeoutController lifecycle");
  }

  console.log("All Cache & Agent tests passed successfully!");
}

runCacheTests().catch((err) => {
  console.error("Cache test failure:", err);
  process.exit(1);
});
