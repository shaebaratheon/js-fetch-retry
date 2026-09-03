/**
 * Performance & Latency Telemetry Tracer.
 */

export interface TimingTrace {
  dnsLookupMs: number;
  tcpHandshakeMs: number;
  tlsNegotiationMs: number;
  ttfbMs: number;
  transferMs: number;
  totalDurationMs: number;
}

export class TelemetryCollector {
  private traces: TimingTrace[] = [];

  public record(trace: TimingTrace) {
    this.traces.push(trace);
  }

  public getP99Latency(): number {
    if (this.traces.length === 0) return 0;
    const durations = this.traces.map((t) => t.totalDurationMs).sort((a, b) => a - b);
    const p99Index = Math.floor(durations.length * 0.99);
    return durations[p99Index];
  }

  public getSummary() {
    return {
      count: this.traces.length,
      p99: this.getP99Latency(),
      avgTtfb: this.traces.reduce((acc, t) => acc + t.ttfbMs, 0) / Math.max(1, this.traces.length),
    };
  }
}
