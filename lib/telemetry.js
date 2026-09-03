/**
 * Telemetry, Latency Histograms, and Retry Event Monitoring.
 */

const EventEmitter = require("events");

class RetryTelemetry extends EventEmitter {
  constructor() {
    super();
    this.totalRequests = 0;
    this.successfulRequests = 0;
    this.failedRequests = 0;
    this.retriedRequests = 0;
    this.latenciesMs = [];
    this.statusDistribution = {};
  }

  recordAttempt(url, attempt, delayMs, error = null) {
    this.retriedRequests++;
    this.emit("retry", {
      url,
      attempt,
      delayMs,
      timestamp: Date.now(),
      error: error ? error.message : null
    });
  }

  recordSuccess(url, totalAttempts, durationMs, statusCode) {
    this.totalRequests++;
    this.successfulRequests++;
    this.latenciesMs.push(durationMs);
    this.statusDistribution[statusCode] = (this.statusDistribution[statusCode] || 0) + 1;
    this.emit("success", { url, totalAttempts, durationMs, statusCode });
  }

  recordFailure(url, totalAttempts, durationMs, error) {
    this.totalRequests++;
    this.failedRequests++;
    this.latenciesMs.push(durationMs);
    this.emit("failure", { url, totalAttempts, durationMs, error: error.message });
  }

  getMetricsSummary() {
    const sorted = [...this.latenciesMs].sort((a, b) => a - b);
    const p50 = sorted.length ? sorted[Math.floor(sorted.length * 0.5)] : 0;
    const p95 = sorted.length ? sorted[Math.floor(sorted.length * 0.95)] : 0;
    const p99 = sorted.length ? sorted[Math.floor(sorted.length * 0.99)] : 0;

    return {
      totalRequests: this.totalRequests,
      successfulRequests: this.successfulRequests,
      failedRequests: this.failedRequests,
      retriedRequests: this.retriedRequests,
      retryRate: this.totalRequests ? (this.retriedRequests / this.totalRequests).toFixed(4) : 0,
      p50LatencyMs: p50,
      p95LatencyMs: p95,
      p99LatencyMs: p99,
      statusCodes: this.statusDistribution
    };
  }

  reset() {
    this.totalRequests = 0;
    this.successfulRequests = 0;
    this.failedRequests = 0;
    this.retriedRequests = 0;
    this.latenciesMs = [];
    this.statusDistribution = {};
  }
}

module.exports = {
  RetryTelemetry
};
