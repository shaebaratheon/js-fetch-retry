/**
 * Real-time HTTP Client Telemetry and Percentile Latency Metrics Collector.
 * Computes moving window distributions, error rates, retry counts, and status code groups.
 */

'use strict';

class MetricsCollector {
  /**
   * @param {Object} [options]
   * @param {number} [options.windowSize=1000] Number of recent requests to track for latency percentiles.
   */
  constructor(options = {}) {
    this.windowSize = options.windowSize || 1000;
    this.latencies = [];
    this.totalRequests = 0;
    this.totalRetries = 0;
    this.totalErrors = 0;
    this.statusCodes = {};
    this.startTime = Date.now();
  }

  /**
   * Records a completed HTTP transaction.
   * @param {Object} record
   * @param {number} record.durationMs Response duration in milliseconds.
   * @param {number} [record.statusCode] HTTP response status code.
   * @param {number} [record.retries=0] Number of retries attempted.
   * @param {boolean} [record.isError=false] Whether the transaction resulted in error.
   */
  record(record) {
    this.totalRequests++;

    if (record.retries) {
      this.totalRetries += record.retries;
    }

    if (record.isError) {
      this.totalErrors++;
    }

    if (record.statusCode) {
      const group = `${Math.floor(record.statusCode / 100)}xx`;
      this.statusCodes[group] = (this.statusCodes[group] || 0) + 1;
      this.statusCodes[record.statusCode] = (this.statusCodes[record.statusCode] || 0) + 1;
    }

    if (typeof record.durationMs === 'number' && record.durationMs >= 0) {
      this.latencies.push(record.durationMs);
      if (this.latencies.length > this.windowSize) {
        this.latencies.shift();
      }
    }
  }

  /**
   * Computes a specific percentile from recorded latencies.
   * @param {number} percentile Number between 0 and 100.
   * @returns {number} Latency in ms at that percentile.
   */
  getPercentile(percentile) {
    if (this.latencies.length === 0) {
      return 0;
    }
    const sorted = [...this.latencies].sort((a, b) => a - b);
    const index = Math.min(
      sorted.length - 1,
      Math.max(0, Math.floor((percentile / 100) * sorted.length))
    );
    return sorted[index];
  }

  /**
   * Returns a snapshot report of current performance telemetry.
   * @returns {Object}
   */
  getSnapshot() {
    const elapsedSeconds = Math.max(1, (Date.now() - this.startTime) / 1000);
    const avgLatency = this.latencies.length > 0
      ? this.latencies.reduce((sum, val) => sum + val, 0) / this.latencies.length
      : 0;

    return {
      totalRequests: this.totalRequests,
      totalRetries: this.totalRetries,
      totalErrors: this.totalErrors,
      throughputRps: Number((this.totalRequests / elapsedSeconds).toFixed(2)),
      errorRate: this.totalRequests > 0
        ? Number((this.totalErrors / this.totalRequests).toFixed(4))
        : 0,
      latency: {
        p50: this.getPercentile(50),
        p90: this.getPercentile(90),
        p99: this.getPercentile(99),
        average: Number(avgLatency.toFixed(2))
      },
      statusCodes: { ...this.statusCodes }
    };
  }

  /**
   * Resets all collected metrics.
   */
  reset() {
    this.latencies = [];
    this.totalRequests = 0;
    this.totalRetries = 0;
    this.totalErrors = 0;
    this.statusCodes = {};
    this.startTime = Date.now();
  }
}

module.exports = {
  MetricsCollector
};
