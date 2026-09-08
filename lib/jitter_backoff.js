'use strict';

/**
 * Computes exponential backoff with full jitter to avoid thundering herd problem.
 * Reference: AWS Architecture Blog - Exponential Backoff and Jitter
 *
 * @param {number} attempt Zero-based retry attempt number.
 * @param {Object} [options]
 * @param {number} [options.baseDelayMs=100] Initial backoff delay in milliseconds.
 * @param {number} [options.maxDelayMs=3000] Ceiling delay for backoff.
 * @returns {number} Delay in milliseconds with random uniform jitter [0, min(maxDelay, base * 2^attempt)].
 */
function calculateFullJitterDelay(attempt, options = {}) {
  const baseDelayMs = options.baseDelayMs || 100;
  const maxDelayMs = options.maxDelayMs || 3000;

  const exponentialDelay = Math.min(maxDelayMs, baseDelayMs * Math.pow(2, attempt));
  // Full jitter: uniformly random between 0 and exponentialDelay
  return Math.floor(Math.random() * (exponentialDelay + 1));
}

module.exports = {
  calculateFullJitterDelay
};
