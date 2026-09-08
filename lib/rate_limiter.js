/**
 * Token Bucket & Leaky Bucket Rate Limiter implementation for HTTP fetch requests.
 * Provides distributed and local concurrency throttling with smooth burst management.
 */

'use strict';

class TokenBucketRateLimiter {
  /**
   * @param {Object} options
   * @param {number} options.capacity Max burst tokens stored in the bucket.
   * @param {number} options.refillRate Number of tokens added per second.
   * @param {number} [options.initialTokens] Initial tokens available. Defaults to capacity.
   */
  constructor(options = {}) {
    this.capacity = options.capacity || 100;
    this.refillRate = options.refillRate || 10; // 10 tokens per second
    this.tokens = options.initialTokens !== undefined ? options.initialTokens : this.capacity;
    this.lastRefillTimestamp = Date.now();
    this.waitQueue = [];
    this.timer = null;
  }

  /**
   * Refills the bucket based on elapsed time.
   * @private
   */
  _refill() {
    const now = Date.now();
    const elapsedSeconds = (now - this.lastRefillTimestamp) / 1000;
    if (elapsedSeconds > 0) {
      const tokensToAdd = elapsedSeconds * this.refillRate;
      this.tokens = Math.min(this.capacity, this.tokens + tokensToAdd);
      this.lastRefillTimestamp = now;
    }
  }

  /**
   * Attempts to consume tokens synchronously without waiting.
   * @param {number} [count=1]
   * @returns {boolean} True if consumed successfully, false otherwise.
   */
  tryAcquire(count = 1) {
    this._refill();
    if (this.tokens >= count) {
      this.tokens -= count;
      return true;
    }
    return false;
  }

  /**
   * Acquires tokens, returning a promise that resolves when tokens become available.
   * @param {number} [count=1]
   * @param {number} [maxWaitMs=30000] Maximum wait time before rejecting.
   * @returns {Promise<void>}
   */
  acquire(count = 1, maxWaitMs = 30000) {
    return new Promise((resolve, reject) => {
      this._refill();

      if (this.tokens >= count && this.waitQueue.length === 0) {
        this.tokens -= count;
        return resolve();
      }

      let timeoutId = null;
      const requestItem = {
        count,
        resolve: () => {
          if (timeoutId) clearTimeout(timeoutId);
          resolve();
        },
        reject: (err) => {
          if (timeoutId) clearTimeout(timeoutId);
          reject(err);
        }
      };

      if (maxWaitMs > 0) {
        timeoutId = setTimeout(() => {
          const index = this.waitQueue.indexOf(requestItem);
          if (index !== -1) {
            this.waitQueue.splice(index, 1);
            requestItem.reject(new Error(`RateLimiter: acquire timeout after ${maxWaitMs}ms`));
          }
        }, maxWaitMs);
      }

      this.waitQueue.push(requestItem);
      this._scheduleDrain();
    });
  }

  /**
   * Processes the wait queue when tokens might be available.
   * @private
   */
  _scheduleDrain() {
    if (this.timer || this.waitQueue.length === 0) {
      return;
    }

    const nextItem = this.waitQueue[0];
    this._refill();

    if (this.tokens >= nextItem.count) {
      this.tokens -= nextItem.count;
      this.waitQueue.shift();
      nextItem.resolve();
      if (this.waitQueue.length > 0) {
        setImmediate(() => this._scheduleDrain());
      }
      return;
    }

    const neededTokens = nextItem.count - this.tokens;
    const waitSeconds = neededTokens / this.refillRate;
    const waitMs = Math.max(10, Math.ceil(waitSeconds * 1000));

    this.timer = setTimeout(() => {
      this.timer = null;
      this._scheduleDrain();
    }, waitMs);
  }

  /**
   * Resets rate limiter state and rejects any queued waiters.
   */
  reset() {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    while (this.waitQueue.length > 0) {
      const item = this.waitQueue.shift();
      item.reject(new Error('RateLimiter: reset called'));
    }
    this.tokens = this.capacity;
    this.lastRefillTimestamp = Date.now();
  }

  /**
   * Returns current statistics.
   * @returns {{availableTokens: number, queuedCount: number, capacity: number}}
   */
  getStats() {
    this._refill();
    return {
      availableTokens: Math.floor(this.tokens),
      queuedCount: this.waitQueue.length,
      capacity: this.capacity
    };
  }
}

class LeakyBucketQueue {
  /**
   * @param {Object} options
   * @param {number} options.rate Requests per second allowed through the leak.
   * @param {number} [options.maxQueueSize=1000] Maximum queued requests before dropping.
   */
  constructor(options = {}) {
    this.rate = options.rate || 10;
    this.intervalMs = 1000 / this.rate;
    this.maxQueueSize = options.maxQueueSize || 1000;
    this.queue = [];
    this.lastLeakTimestamp = 0;
    this.timer = null;
  }

  /**
   * Enqueues an operation to be executed according to the leak rate.
   * @param {Function} task Async function to execute.
   * @returns {Promise<*>}
   */
  enqueue(task) {
    if (this.queue.length >= this.maxQueueSize) {
      return Promise.reject(new Error('LeakyBucketQueue: Queue capacity exceeded'));
    }

    return new Promise((resolve, reject) => {
      this.queue.push({ task, resolve, reject });
      this._processQueue();
    });
  }

  /**
   * @private
   */
  _processQueue() {
    if (this.timer || this.queue.length === 0) {
      return;
    }

    const now = Date.now();
    const elapsed = now - this.lastLeakTimestamp;

    if (elapsed >= this.intervalMs) {
      this.lastLeakTimestamp = now;
      const { task, resolve, reject } = this.queue.shift();
      try {
        Promise.resolve(task()).then(resolve, reject);
      } catch (err) {
        reject(err);
      }

      if (this.queue.length > 0) {
        this.timer = setTimeout(() => {
          this.timer = null;
          this._processQueue();
        }, this.intervalMs);
      }
    } else {
      const waitMs = this.intervalMs - elapsed;
      this.timer = setTimeout(() => {
        this.timer = null;
        this._processQueue();
      }, waitMs);
    }
  }

  /**
   * Clears the pending queue.
   */
  clear() {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    while (this.queue.length > 0) {
      const { reject } = this.queue.shift();
      reject(new Error('LeakyBucketQueue: Cleared'));
    }
  }
}

module.exports = {
  TokenBucketRateLimiter,
  LeakyBucketQueue
};
