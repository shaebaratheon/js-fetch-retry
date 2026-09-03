/**
 * Unit and Functional Tests for fetch-retry algorithms, circuit breaker, and interceptors.
 */

const assert = require("assert");
const { BackoffCalculator, CircuitBreaker, CircuitState, StatusClassifier, JitterStrategy } = require("../lib/retry_policy");
const { InterceptorManager, TokenBucketRateLimiter, HeaderEnricher } = require("../lib/interceptor");
const { RetryTelemetry } = require("../lib/telemetry");

async function runTests() {
  console.log("Starting js-fetch-retry unit tests...");

  // Test 1: Backoff calculator bounds
  {
    const backoff = new BackoffCalculator({ baseDelayMs: 100, maxDelayMs: 800, factor: 2, jitter: JitterStrategy.NONE });
    assert.strictEqual(backoff.compute(0), 100);
    assert.strictEqual(backoff.compute(1), 200);
    assert.strictEqual(backoff.compute(2), 400);
    assert.strictEqual(backoff.compute(3), 800);
    assert.strictEqual(backoff.compute(4), 800); // capped
    console.log("  [PASS] Backoff exponential calculation");
  }

  // Test 2: Full jitter randomization
  {
    const backoff = new BackoffCalculator({ baseDelayMs: 200, maxDelayMs: 1000, factor: 2, jitter: JitterStrategy.FULL });
    for (let i = 0; i < 20; i++) {
      const delay = backoff.compute(2);
      assert(delay >= 0 && delay <= 800, `Delay ${delay} out of range [0, 800]`);
    }
    console.log("  [PASS] Full jitter bounds verification");
  }

  // Test 3: Status classifier
  {
    assert.strictEqual(StatusClassifier.isRetryable(503, "GET"), true);
    assert.strictEqual(StatusClassifier.isRetryable(429, "POST"), true);
    assert.strictEqual(StatusClassifier.isRetryable(500, "POST"), false); // non-idempotent POST
    assert.strictEqual(StatusClassifier.isRetryable(404, "GET"), false);
    assert.strictEqual(StatusClassifier.isNetworkError({ code: "ECONNRESET" }), true);
    assert.strictEqual(StatusClassifier.isNetworkError({ code: "EPERM" }), false);
    console.log("  [PASS] Status and network error classification");
  }

  // Test 4: Circuit Breaker Trips and Recovers
  {
    const breaker = new CircuitBreaker({ failureThreshold: 3, resetTimeoutMs: 50, successThreshold: 2 });
    assert.strictEqual(breaker.state, CircuitState.CLOSED);

    breaker.recordFailure();
    breaker.recordFailure();
    assert.strictEqual(breaker.state, CircuitState.CLOSED);
    breaker.recordFailure();
    assert.strictEqual(breaker.state, CircuitState.OPEN);
    assert.strictEqual(breaker.canExecute(), false);

    // Wait for cooldown
    await new Promise((res) => setTimeout(res, 60));
    assert.strictEqual(breaker.canExecute(), true);
    assert.strictEqual(breaker.state, CircuitState.HALF_OPEN);

    breaker.recordSuccess();
    breaker.recordSuccess();
    assert.strictEqual(breaker.state, CircuitState.CLOSED);
    console.log("  [PASS] Circuit breaker trip and recovery state machine");
  }

  // Test 5: Interceptor Pipeline
  {
    const manager = new InterceptorManager();
    manager.use((cfg) => {
      cfg.headers = cfg.headers || {};
      cfg.headers["X-Custom"] = "val-1";
      return cfg;
    });
    manager.use(HeaderEnricher.createTraceContextInjector());

    const result = await manager.run({});
    assert.strictEqual(result.headers["X-Custom"], "val-1");
    assert(result.headers["X-Request-Id"].startsWith("req_"));
    console.log("  [PASS] Interceptor pipeline chaining");
  }

  // Test 6: Token Bucket Rate Limiter
  {
    const limiter = new TokenBucketRateLimiter(2, 5);
    assert.strictEqual(limiter.tryAcquire(1), true);
    assert.strictEqual(limiter.tryAcquire(1), true);
    assert.strictEqual(limiter.tryAcquire(1), false); // capacity reached
    console.log("  [PASS] Token bucket burst limit enforcement");
  }

  // Test 7: Telemetry summary
  {
    const telemetry = new RetryTelemetry();
    telemetry.recordAttempt("https://api.test/data", 1, 150);
    telemetry.recordSuccess("https://api.test/data", 2, 250, 200);

    const summary = telemetry.getMetricsSummary();
    assert.strictEqual(summary.totalRequests, 1);
    assert.strictEqual(summary.successfulRequests, 1);
    assert.strictEqual(summary.retriedRequests, 1);
    assert.strictEqual(summary.statusCodes[200], 1);
    console.log("  [PASS] Telemetry recording and metrics summary");
  }

  console.log("All js-fetch-retry tests passed successfully!");
}

runTests().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
