import { SlidingWindowLogRateLimiter } from '../src/resilience/distributed_limiter';

describe('SlidingWindowLogRateLimiter', () => {
  it('enforces exact sliding window request count boundary', async () => {
    const limiter = new SlidingWindowLogRateLimiter(1000, 3);
    const client = 'client-alpha';

    expect(await limiter.isAllowed(client)).toBe(true);
    expect(await limiter.isAllowed(client)).toBe(true);
    expect(await limiter.isAllowed(client)).toBe(true);
    expect(await limiter.isAllowed(client)).toBe(false);

    expect(limiter.getRemainingQuota(client)).toBe(0);
  });
});
