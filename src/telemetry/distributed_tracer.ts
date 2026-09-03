/**
 * OpenTelemetry compatible W3C TraceContext & Baggage header propagator.
 */

export interface SpanContext {
  traceId: string;
  spanId: string;
  traceFlags: number;
}

export class W3CTracePropagator {
  public static generateTraceId(): string {
    return Array.from({ length: 32 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
  }

  public static generateSpanId(): string {
    return Array.from({ length: 16 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
  }

  public static inject(span: SpanContext, headers: Record<string, string>): Record<string, string> {
    const traceparent = `00-${span.traceId}-${span.spanId}-${span.traceFlags.toString(16).padStart(2, '0')}`;
    return { ...headers, traceparent };
  }

  public static extract(traceparentHeader?: string): SpanContext | null {
    if (!traceparentHeader) return null;
    const parts = traceparentHeader.split('-');
    if (parts.length < 4 || parts[0] !== '00') return null;
    return {
      traceId: parts[1],
      spanId: parts[2],
      traceFlags: parseInt(parts[3], 16),
    };
  }
}
