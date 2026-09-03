import { W3CTracePropagator } from '../src/telemetry/distributed_tracer';

describe('W3CTracePropagator', () => {
  it('injects and extracts standard W3C traceparent headers', () => {
    const span = {
      traceId: W3CTracePropagator.generateTraceId(),
      spanId: W3CTracePropagator.generateSpanId(),
      traceFlags: 1,
    };
    const headers = W3CTracePropagator.inject(span, {});
    const extracted = W3CTracePropagator.extract(headers.traceparent);
    expect(extracted).toEqual(span);
  });
});
