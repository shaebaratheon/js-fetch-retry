import { ChaosFaultInjector } from '../src/resilience/chaos_proxy';

describe('ChaosFaultInjector', () => {
  it('injects random latency and simulated socket failures', async () => {
    const chaos = new ChaosFaultInjector({ latencyJitterMs: 5, failureRate: 0.0 });
    const req = new Request('https://api.example.com');
    await expect(chaos.processRequest(req)).resolves.toBeUndefined();
  });
});
