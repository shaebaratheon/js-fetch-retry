/**
 * Automated Active Health Prober & Latency Threshold Watcher.
 */

export interface HealthTarget {
  endpoint: string;
  intervalMs: number;
  expectedStatus: number;
}

export class ServiceHealthProber {
  private statusMap: Map<string, boolean> = new Map();

  constructor(private readonly targets: HealthTarget[]) {}

  public async probeAll(): Promise<Record<string, boolean>> {
    const result: Record<string, boolean> = {};
    for (const t of this.targets) {
      try {
        const resp = await fetch(t.endpoint, { method: 'HEAD' });
        const ok = resp.status === t.expectedStatus;
        this.statusMap.set(t.endpoint, ok);
        result[t.endpoint] = ok;
      } catch (err) {
        this.statusMap.set(t.endpoint, false);
        result[t.endpoint] = false;
      }
    }
    return result;
  }
}
