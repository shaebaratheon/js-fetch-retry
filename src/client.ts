/**
 * Enterprise Resilient Fetch Client combining Interceptors, Circuit Breaker, Retries, and Caching.
 */

import { InterceptorPipeline, Interceptor, RequestContext } from './interceptor/pipeline';
import { BackoffCalculator, RetryOptions, JitterType } from './retry/strategy';
import { CircuitBreaker, CircuitBreakerConfig } from './resilience/circuit_breaker';
import { LRUCacheStore } from './cache/store';

export interface ClientConfig {
  retry?: Partial<RetryOptions>;
  circuitBreaker?: Partial<CircuitBreakerConfig>;
  cacheCapacity?: number;
  defaultHeaders?: Record<string, string>;
}

export class ResilientFetchClient {
  private pipeline = new InterceptorPipeline();
  private cache: LRUCacheStore;
  private breaker: CircuitBreaker;
  private retryOptions: RetryOptions;

  constructor(config: ClientConfig = {}) {
    this.retryOptions = {
      maxRetries: config.retry?.maxRetries ?? 3,
      baseDelayMs: config.retry?.baseDelayMs ?? 100,
      maxDelayMs: config.retry?.maxDelayMs ?? 2000,
      backoffFactor: config.retry?.backoffFactor ?? 2,
      jitter: config.retry?.jitter ?? JitterType.FULL,
      retryOnStatus: config.retry?.retryOnStatus ?? [429, 500, 502, 503, 504],
      retryOnErrors: config.retry?.retryOnErrors ?? ['FetchError', 'AbortError', 'TypeError'],
    };

    this.breaker = new CircuitBreaker({
      failureThresholdPercentage: config.circuitBreaker?.failureThresholdPercentage ?? 50,
      minimumRequests: config.circuitBreaker?.minimumRequests ?? 5,
      samplingDurationMs: config.circuitBreaker?.samplingDurationMs ?? 10000,
      resetTimeoutMs: config.circuitBreaker?.resetTimeoutMs ?? 5000,
      halfOpenMaxTrials: config.circuitBreaker?.halfOpenMaxTrials ?? 2,
    });

    this.cache = new LRUCacheStore(config.cacheCapacity ?? 500);
  }

  public use(interceptor: Interceptor): this {
    this.pipeline.use(interceptor);
    return this;
  }

  public async fetch(url: string, options: RequestInit = {}): Promise<Response> {
    const context: RequestContext = {
      url,
      options,
      metadata: {},
      attempt: 1,
    };

    return this.pipeline.execute(context, async (ctx) => {
      const calculator = new BackoffCalculator(this.retryOptions);
      let lastError: Error | undefined;

      for (let attempt = 1; attempt <= this.retryOptions.maxRetries + 1; attempt++) {
        ctx.attempt = attempt;
        try {
          const resp = await this.breaker.execute(async () => {
            return await fetch(ctx.url, ctx.options);
          });

          if (calculator.shouldRetry(resp.status, undefined, attempt)) {
            const delay = calculator.calculateDelay(attempt);
            await new Promise((resolve) => setTimeout(resolve, delay));
            continue;
          }
          return resp;
        } catch (err: any) {
          lastError = err;
          if (calculator.shouldRetry(undefined, err, attempt)) {
            const delay = calculator.calculateDelay(attempt);
            await new Promise((resolve) => setTimeout(resolve, delay));
            continue;
          }
          throw err;
        }
      }

      throw lastError || new Error(`Request failed after ${this.retryOptions.maxRetries} retries`);
    });
  }
}
