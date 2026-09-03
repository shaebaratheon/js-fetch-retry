import { TelemetryCollector } from '../src/telemetry/metrics_collector';

describe('TelemetryCollector', () => {
  it('computes accurate p99 and latency metrics', () => {
    const collector = new TelemetryCollector();
    for (let i = 1; i <= 100; i++) {
      collector.record({
        dnsLookupMs: 2,
        tcpHandshakeMs: 5,
        tlsNegotiationMs: 10,
        ttfbMs: 20 + i,
        transferMs: 5,
        totalDurationMs: 42 + i,
      });
    }
    const summary = collector.getSummary();
    expect(summary.count).toBe(100);
    expect(summary.p99).toBe(141);
  });
});
