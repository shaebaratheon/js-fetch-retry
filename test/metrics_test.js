/**
 * Test suite for MetricsCollector.
 */

'use strict';

const assert = require('assert');
const { MetricsCollector } = require('../lib/metrics_collector');

describe('MetricsCollector', () => {
  it('should calculate accurate percentiles across latency distributions', () => {
    const collector = new MetricsCollector({ windowSize: 100 });

    for (let i = 1; i <= 100; i++) {
      collector.record({ durationMs: i, statusCode: 200 });
    }

    const snapshot = collector.getSnapshot();
    assert.strictEqual(snapshot.totalRequests, 100);
    assert.strictEqual(snapshot.totalErrors, 0);
    assert.strictEqual(snapshot.latency.p50, 51);
    assert.strictEqual(snapshot.latency.p90, 91);
    assert.strictEqual(snapshot.latency.p99, 100);
  });

  it('should categorize HTTP status codes correctly', () => {
    const collector = new MetricsCollector();

    collector.record({ durationMs: 10, statusCode: 200 });
    collector.record({ durationMs: 15, statusCode: 204 });
    collector.record({ durationMs: 50, statusCode: 404, isError: true });
    collector.record({ durationMs: 80, statusCode: 502, isError: true });

    const snapshot = collector.getSnapshot();
    assert.strictEqual(snapshot.totalRequests, 4);
    assert.strictEqual(snapshot.totalErrors, 2);
    assert.strictEqual(snapshot.statusCodes['2xx'], 2);
    assert.strictEqual(snapshot.statusCodes['4xx'], 1);
    assert.strictEqual(snapshot.statusCodes['5xx'], 1);
    assert.strictEqual(snapshot.statusCodes[200], 1);
    assert.strictEqual(snapshot.statusCodes[502], 1);
    assert.strictEqual(snapshot.errorRate, 0.5);
  });

  it('should respect moving window size and reset cleanly', () => {
    const collector = new MetricsCollector({ windowSize: 5 });

    for (let i = 1; i <= 10; i++) {
      collector.record({ durationMs: i * 10 });
    }

    assert.strictEqual(collector.latencies.length, 5);
    assert.deepStrictEqual(collector.latencies, [60, 70, 80, 90, 100]);

    collector.reset();
    const fresh = collector.getSnapshot();
    assert.strictEqual(fresh.totalRequests, 0);
    assert.strictEqual(fresh.latency.average, 0);
  });
});
