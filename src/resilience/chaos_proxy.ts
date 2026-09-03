/**
 * Chaos Engineering Fault Injection Proxy for Network Resilience Testing.
 */

export interface FaultConfig {
  latencyJitterMs?: number;
  failureRate?: number;
  corruptResponseBodyRate?: number;
}

export class ChaosFaultInjector {
  constructor(private readonly config: FaultConfig) {}

  public async processRequest(req: Request): Promise<void> {
    if (this.config.latencyJitterMs && this.config.latencyJitterMs > 0) {
      const delay = Math.random() * this.config.latencyJitterMs;
      await new Promise((r) => setTimeout(r, delay));
    }
    if (this.config.failureRate && Math.random() < this.config.failureRate) {
      throw new Error(`[Chaos Engineering] Simulated 500 Network Socket Exception`);
    }
  }

  public injectResponseCorruption(body: string): string {
    if (this.config.corruptResponseBodyRate && Math.random() < this.config.corruptResponseBodyRate) {
      return body.slice(0, Math.floor(body.length / 2)) + '<!-- TRUNCATED_BY_CHAOS -->';
    }
    return body;
  }
}
