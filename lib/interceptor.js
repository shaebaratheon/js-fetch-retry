/**
 * Request/Response Interceptor Pipeline and Client-Side Rate Limiter.
 */

class InterceptorManager {
  constructor() {
    this.handlers = [];
  }

  use(fulfilled, rejected) {
    this.handlers.push({
      fulfilled: typeof fulfilled === "function" ? fulfilled : (val) => val,
      rejected: typeof rejected === "function" ? rejected : (err) => Promise.reject(err)
    });
    return this.handlers.length - 1;
  }

  eject(id) {
    if (this.handlers[id]) {
      this.handlers[id] = null;
    }
  }

  async run(input) {
    let current = input;
    for (const h of this.handlers) {
      if (h !== null) {
        try {
          current = await h.fulfilled(current);
        } catch (err) {
          return await h.rejected(err);
        }
      }
    }
    return current;
  }
}

class TokenBucketRateLimiter {
  /**
   * Token bucket rate limiter for client-side throughput smoothing.
   * @param {number} capacity - Maximum bucket burst capacity
   * @param {number} refillRatePerSec - Tokens added per second
   */
  constructor(capacity = 50, refillRatePerSec = 10) {
    this.capacity = capacity;
    this.refillRatePerSec = refillRatePerSec;
    this.tokens = capacity;
    this.lastRefill = Date.now();
  }

  _refill() {
    const now = Date.now();
    const elapsedSec = (now - this.lastRefill) / 1000;
    this.tokens = Math.min(this.capacity, this.tokens + elapsedSec * this.refillRatePerSec);
    this.lastRefill = now;
  }

  tryAcquire(tokens = 1) {
    this._refill();
    if (this.tokens >= tokens) {
      this.tokens -= tokens;
      return true;
    }
    return false;
  }

  async acquire(tokens = 1, maxWaitMs = 5000) {
    const startTime = Date.now();
    while (!this.tryAcquire(tokens)) {
      if (Date.now() - startTime > maxWaitMs) {
        throw new Error("Rate limit wait timeout exceeded.");
      }
      await new Promise((res) => setTimeout(res, 50));
    }
  }
}

class HeaderEnricher {
  static createAuthHeaderInjector(tokenProvider) {
    return async (config) => {
      const token = typeof tokenProvider === "function" ? await tokenProvider() : tokenProvider;
      config.headers = config.headers || {};
      config.headers["Authorization"] = `Bearer ${token}`;
      return config;
    };
  }

  static createTraceContextInjector() {
    return (config) => {
      config.headers = config.headers || {};
      config.headers["X-Request-Id"] = `req_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
      config.headers["X-Client-Timestamp"] = new Date().toISOString();
      return config;
    };
  }
}

module.exports = {
  InterceptorManager,
  TokenBucketRateLimiter,
  HeaderEnricher
};
