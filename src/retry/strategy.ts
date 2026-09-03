/**
 * Advanced Backoff Algorithms: Exponential, Full Jitter, Equal Jitter, and Decorrelated Jitter.
 */

export enum JitterType {
  NONE = 'none',
  FULL = 'full',
  EQUAL = 'equal',
  DECORRELATED = 'decorrelated',
}

export interface RetryOptions {
  maxRetries: number;
  baseDelayMs: number;
  maxDelayMs: number;
  backoffFactor: number;
  jitter: JitterType;
  retryOnStatus?: number[];
  retryOnErrors?: string[];
}

export class BackoffCalculator {
  private lastDelay: number;

  constructor(private readonly options: RetryOptions) {
    this.lastDelay = options.baseDelayMs;
  }

  public calculateDelay(attempt: number): number {
    const { baseDelayMs, maxDelayMs, backoffFactor, jitter } = this.options;
    const exponentialDelay = Math.min(maxDelayMs, baseDelayMs * Math.pow(backoffFactor, attempt - 1));

    switch (jitter) {
      case JitterType.FULL:
        return Math.floor(Math.random() * exponentialDelay);
      case JitterType.EQUAL: {
        const half = exponentialDelay / 2;
        return Math.floor(half + Math.random() * half);
      }
      case JitterType.DECORRELATED: {
        const nextSleep = Math.min(maxDelayMs, Math.random() * (this.lastDelay * 3 - baseDelayMs) + baseDelayMs);
        this.lastDelay = nextSleep;
        return Math.floor(nextSleep);
      }
      case JitterType.NONE:
      default:
        return exponentialDelay;
    }
  }

  public shouldRetry(status?: number, error?: Error, attempt: number = 1): boolean {
    if (attempt > this.options.maxRetries) {
      return false;
    }
    if (status && this.options.retryOnStatus?.includes(status)) {
      return true;
    }
    if (error && this.options.retryOnErrors?.some((e) => error.message.includes(e) || error.name === e)) {
      return true;
    }
    return false;
  }
}
