/**
 * Distributed Sliding Window Log and Token Bucket Rate Limiter with Redis Protocol Client.
 */

export interface RedisDriver {
  eval(script: string, numKeys: number, ...args: (string | number)[]): Promise<any>;
  get(key: string): Promise<string | null>;
  set(key: string, val: string, exSeconds?: number): Promise<string>;
}

export class SlidingWindowLogRateLimiter {
  private inMemoryLogs: Map<string, number[]> = new Map();

  constructor(
    private readonly windowSizeMs: number = 60000,
    private readonly maxRequestsPerWindow: number = 100,
    private readonly redisClient?: RedisDriver
  ) {}

  public async isAllowed(clientId: string): Promise<boolean> {
    const now = Date.now();
    const windowStart = now - this.windowSizeMs;

    if (this.redisClient) {
      const luaScript = `
        local key = KEYS[1]
        local now = tonumber(ARGV[1])
        local windowStart = tonumber(ARGV[2])
        local maxLimit = tonumber(ARGV[3])
        local windowMs = tonumber(ARGV[4])

        redis.call('ZREMRANGEBYSCORE', key, 0, windowStart)
        local currentCount = redis.call('ZCARD', key)
        if currentCount < maxLimit then
            redis.call('ZADD', key, now, now .. '-' .. math.random())
            redis.call('PEXPIRE', key, windowMs)
            return 1
        else
            return 0
        end
      `;
      const res = await this.redisClient.eval(luaScript, 1, clientId, now, windowStart, this.maxRequestsPerWindow, this.windowSizeMs);
      return res === 1;
    }

    let timestamps = this.inMemoryLogs.get(clientId) || [];
    timestamps = timestamps.filter((t) => t > windowStart);
    if (timestamps.length < this.maxRequestsPerWindow) {
      timestamps.push(now);
      this.inMemoryLogs.set(clientId, timestamps);
      return true;
    }
    return false;
  }

  public getRemainingQuota(clientId: string): number {
    const now = Date.now();
    const windowStart = now - this.windowSizeMs;
    const timestamps = (this.inMemoryLogs.get(clientId) || []).filter((t) => t > windowStart);
    return Math.max(0, this.maxRequestsPerWindow - timestamps.length);
  }
}
