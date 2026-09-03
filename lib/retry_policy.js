/**
 * Comprehensive Retry Strategies, Backoff Algorithms, and Circuit Breaker.
 */

const JitterStrategy = {
  NONE: "none",
  FULL: "full",
  EQUAL: "equal",
  DECORRELATED: "decorrelated"
};

class BackoffCalculator {
  /**
   * @param {Object} options
   * @param {number} options.baseDelayMs - Initial base delay in ms (default: 300)
   * @param {number} options.maxDelayMs - Maximum delay cap in ms (default: 10000)
   * @param {number} options.factor - Multiplicative backoff factor (default: 2)
   * @param {string} options.jitter - Jitter strategy (none|full|equal|decorrelated)
   */
  constructor(options = {}) {
    this.baseDelayMs = options.baseDelayMs || 300;
    this.maxDelayMs = options.maxDelayMs || 10000;
    this.factor = options.factor || 2;
    this.jitter = options.jitter || JitterStrategy.FULL;
    this._prevSleep = this.baseDelayMs;
  }

  compute(attempt) {
    let raw = this.baseDelayMs * Math.pow(this.factor, attempt);
    let capped = Math.min(raw, this.maxDelayMs);

    switch (this.jitter) {
      case JitterStrategy.FULL:
        return Math.floor(Math.random() * capped);
      case JitterStrategy.EQUAL:
        let half = capped / 2;
        return Math.floor(half + Math.random() * half);
      case JitterStrategy.DECORRELATED:
        let sleep = Math.min(this.maxDelayMs, Math.random() * (this._prevSleep * 3 - this.baseDelayMs) + this.baseDelayMs);
        this._prevSleep = sleep;
        return Math.floor(sleep);
      case JitterStrategy.NONE:
      default:
        return Math.floor(capped);
    }
  }
}

class CircuitBreakerOpenError extends Error {
  constructor(message) {
    super(message);
    this.name = "CircuitBreakerOpenError";
  }
}

const CircuitState = {
  CLOSED: "CLOSED",
  OPEN: "OPEN",
  HALF_OPEN: "HALF_OPEN"
};

class CircuitBreaker {
  /**
   * Prevents cascading failures when downstream service is failing continuously.
   * @param {Object} options
   * @param {number} options.failureThreshold - Number of consecutive errors to trip circuit
   * @param {number} options.resetTimeoutMs - Time to wait before attempting probe request
   */
  constructor(options = {}) {
    this.failureThreshold = options.failureThreshold || 5;
    this.resetTimeoutMs = options.resetTimeoutMs || 15000;
    this.state = CircuitState.CLOSED;
    this.consecutiveFailures = 0;
    this.nextAttempt = Date.now();
    this.successThreshold = options.successThreshold || 2;
    this.consecutiveSuccesses = 0;
  }

  canExecute() {
    if (this.state === CircuitState.CLOSED) {
      return true;
    }
    if (this.state === CircuitState.OPEN) {
      if (Date.now() >= this.nextAttempt) {
        this.state = CircuitState.HALF_OPEN;
        return true;
      }
      return false;
    }
    if (this.state === CircuitState.HALF_OPEN) {
      return true;
    }
    return false;
  }

  recordSuccess() {
    if (this.state === CircuitState.HALF_OPEN) {
      this.consecutiveSuccesses++;
      if (this.consecutiveSuccesses >= this.successThreshold) {
        this.reset();
      }
    } else {
      this.consecutiveFailures = 0;
    }
  }

  recordFailure() {
    this.consecutiveFailures++;
    this.consecutiveSuccesses = 0;
    if (this.consecutiveFailures >= this.failureThreshold || this.state === CircuitState.HALF_OPEN) {
      this.trip();
    }
  }

  trip() {
    this.state = CircuitState.OPEN;
    this.nextAttempt = Date.now() + this.resetTimeoutMs;
  }

  reset() {
    this.state = CircuitState.CLOSED;
    this.consecutiveFailures = 0;
    this.consecutiveSuccesses = 0;
  }
}

class StatusClassifier {
  /**
   * Determines whether an HTTP response status or network error is retryable.
   */
  static isRetryable(statusCode, method = "GET") {
    // 408 Request Timeout, 429 Too Many Requests, 500, 502, 503, 504
    const transientCodes = new Set([408, 429, 500, 502, 503, 504]);
    if (!transientCodes.has(statusCode)) {
      return false;
    }
    // Mutation methods are only retryable on explicit idempotent handlers
    const idempotentMethods = new Set(["GET", "HEAD", "PUT", "DELETE", "OPTIONS"]);
    if (!idempotentMethods.has(method.toUpperCase()) && statusCode !== 429) {
      return false;
    }
    return true;
  }

  static isNetworkError(err) {
    if (!err) return false;
    const transientCodes = new Set([
      "ECONNRESET",
      "ETIMEDOUT",
      "ECONNREFUSED",
      "EHOSTUNREACH",
      "ENOTFOUND",
      "UND_ERR_SOCKET"
    ]);
    return transientCodes.has(err.code) || err.name === "AbortError" || err.message?.includes("fetch failed");
  }
}

module.exports = {
  JitterStrategy,
  BackoffCalculator,
  CircuitBreaker,
  CircuitState,
  CircuitBreakerOpenError,
  StatusClassifier
};
