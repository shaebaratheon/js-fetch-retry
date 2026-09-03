import { TokenBucketRateLimiter } from '../src/resilience/rate_limiter';

describe('TokenBucketRateLimiter', () => {
  it('allows burst up to capacity and throttles afterwards', async () => {
    const limiter = new TokenBucketRateLimiter(2, 10);
    expect(await limiter.acquire(1)).toBe(true);
    expect(await limiter.acquire(1)).toBe(true);
    expect(await limiter.acquire(1)).toBe(false);
  });
});
