/**
 * Test suite for TokenBucketRateLimiter and LeakyBucketQueue.
 */

'use strict';

const assert = require('assert');
const { TokenBucketRateLimiter, LeakyBucketQueue } = require('../lib/rate_limiter');

describe('TokenBucketRateLimiter', () => {
  it('should initialize with full capacity and consume synchronously', () => {
    const limiter = new TokenBucketRateLimiter({ capacity: 5, refillRate: 1 });
    assert.strictEqual(limiter.tryAcquire(3), true);
    assert.strictEqual(limiter.tryAcquire(2), true);
    assert.strictEqual(limiter.tryAcquire(1), false);
  });

  it('should wait and acquire tokens asynchronously when bucket refills', async () => {
    const limiter = new TokenBucketRateLimiter({ capacity: 2, refillRate: 20 });
    assert.strictEqual(limiter.tryAcquire(2), true);

    const start = Date.now();
    await limiter.acquire(1);
    const elapsed = Date.now() - start;

    assert.ok(elapsed >= 20, `Elapsed time ${elapsed}ms should be at least 20ms`);
  });

  it('should reject acquire when maximum wait time is exceeded', async () => {
    const limiter = new TokenBucketRateLimiter({ capacity: 1, refillRate: 0.1 });
    assert.strictEqual(limiter.tryAcquire(1), true);

    await assert.rejects(
      async () => {
        await limiter.acquire(1, 50);
      },
      /timeout/i
    );
  });

  it('should accurately report available stats', () => {
    const limiter = new TokenBucketRateLimiter({ capacity: 10, refillRate: 5 });
    limiter.tryAcquire(4);
    const stats = limiter.getStats();
    assert.strictEqual(stats.capacity, 10);
    assert.strictEqual(stats.availableTokens, 6);
    assert.strictEqual(stats.queuedCount, 0);
  });
});

describe('LeakyBucketQueue', () => {
  it('should drain enqueued tasks according to leak rate', async () => {
    const queue = new LeakyBucketQueue({ rate: 50 }); // 20ms per task
    const executionTimes = [];

    const p1 = queue.enqueue(() => executionTimes.push(Date.now()));
    const p2 = queue.enqueue(() => executionTimes.push(Date.now()));
    const p3 = queue.enqueue(() => executionTimes.push(Date.now()));

    await Promise.all([p1, p2, p3]);

    assert.strictEqual(executionTimes.length, 3);
    assert.ok(executionTimes[1] - executionTimes[0] >= 15);
    assert.ok(executionTimes[2] - executionTimes[1] >= 15);
  });

  it('should enforce max queue size', async () => {
    const queue = new LeakyBucketQueue({ rate: 1, maxQueueSize: 2 });
    queue.enqueue(() => new Promise((resolve) => setTimeout(resolve, 500)));
    queue.enqueue(() => 2);

    await assert.rejects(
      async () => {
        await queue.enqueue(() => 3);
      },
      /Queue capacity exceeded/
    );

    queue.clear();
  });
});
