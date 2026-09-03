import { ResilientFetchClient } from '../src/client';
import { CircuitBreaker, CircuitState } from '../src/resilience/circuit_breaker';
import { LRUCacheStore } from '../src/cache/store';
import { BackoffCalculator, JitterType } from '../src/retry/strategy';

describe('Resilience and HTTP Client Suite', () => {
  describe('BackoffCalculator', () => {
    it('calculates bounded exponential delay with full jitter', () => {
      const calc = new BackoffCalculator({
        maxRetries: 3,
        baseDelayMs: 100,
        maxDelayMs: 1000,
        backoffFactor: 2,
        jitter: JitterType.FULL,
      });

      for (let attempt = 1; attempt <= 3; attempt++) {
        const delay = calc.calculateDelay(attempt);
        expect(delay).toBeGreaterThanOrEqual(0);
        expect(delay).toBeLessThanOrEqual(1000);
      }
    });

    it('determines retry requirement based on status codes', () => {
      const calc = new BackoffCalculator({
        maxRetries: 2,
        baseDelayMs: 50,
        maxDelayMs: 500,
        backoffFactor: 2,
        jitter: JitterType.NONE,
        retryOnStatus: [503, 504],
      });

      expect(calc.shouldRetry(503, undefined, 1)).toBe(true);
      expect(calc.shouldRetry(200, undefined, 1)).toBe(false);
      expect(calc.shouldRetry(503, undefined, 3)).toBe(false);
    });
  });

  describe('CircuitBreaker', () => {
    it('transitions to OPEN on repeated failures and trips requests', async () => {
      const breaker = new CircuitBreaker({
        failureThresholdPercentage: 50,
        minimumRequests: 2,
        samplingDurationMs: 1000,
        resetTimeoutMs: 200,
        halfOpenMaxTrials: 1,
      });

      await expect(breaker.execute(async () => { throw new Error('fail'); })).rejects.toThrow('fail');
      await expect(breaker.execute(async () => { throw new Error('fail'); })).rejects.toThrow('fail');

      expect(breaker.getState()).toBe(CircuitState.OPEN);
      await expect(breaker.execute(async () => 'ok')).rejects.toThrow(/blocked/);
    });
  });

  describe('LRUCacheStore', () => {
    it('evicts oldest keys upon exceeding maximum capacity', () => {
      const cache = new LRUCacheStore(2);
      cache.set('k1', { key: 'k1', responseBody: '1', status: 200, headers: {}, createdAt: Date.now(), expiresAt: Date.now() + 10000 });
      cache.set('k2', { key: 'k2', responseBody: '2', status: 200, headers: {}, createdAt: Date.now(), expiresAt: Date.now() + 10000 });
      cache.get('k1'); // Access k1 so k2 becomes least recently used
      cache.set('k3', { key: 'k3', responseBody: '3', status: 200, headers: {}, createdAt: Date.now(), expiresAt: Date.now() + 10000 });

      expect(cache.get('k1')).toBeDefined();
      expect(cache.get('k3')).toBeDefined();
      expect(cache.get('k2')).toBeUndefined();
    });
  });
});
