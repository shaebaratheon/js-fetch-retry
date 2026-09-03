/**
 * Circuit Breaker Pattern State Machine with sliding window metrics tracking.
 */

export enum CircuitState {
  CLOSED = 'CLOSED',
  OPEN = 'OPEN',
  HALF_OPEN = 'HALF_OPEN',
}

export interface CircuitBreakerConfig {
  failureThresholdPercentage: number;
  minimumRequests: number;
  samplingDurationMs: number;
  resetTimeoutMs: number;
  halfOpenMaxTrials: number;
}

interface ExecutionResult {
  timestamp: number;
  success: boolean;
}

export class CircuitBreaker {
  private state: CircuitState = CircuitState.CLOSED;
  private results: ExecutionResult[] = [];
  private lastStateChange: number = Date.now();
  private halfOpenTrials: number = 0;

  constructor(private readonly config: CircuitBreakerConfig) {}

  public getState(): CircuitState {
    this.evaluateStateTransition();
    return this.state;
  }

  private evaluateStateTransition() {
    const now = Date.now();
    if (this.state === CircuitState.OPEN) {
      if (now - this.lastStateChange >= this.config.resetTimeoutMs) {
        this.state = CircuitState.HALF_OPEN;
        this.halfOpenTrials = 0;
        this.lastStateChange = now;
      }
    }
  }

  public recordSuccess() {
    this.evaluateStateTransition();
    if (this.state === CircuitState.HALF_OPEN) {
      this.halfOpenTrials++;
      if (this.halfOpenTrials >= this.config.halfOpenMaxTrials) {
        this.state = CircuitState.CLOSED;
        this.results = [];
        this.lastStateChange = Date.now();
      }
    } else if (this.state === CircuitState.CLOSED) {
      this.results.push({ timestamp: Date.now(), success: true });
      this.trimOldResults();
    }
  }

  public recordFailure() {
    this.evaluateStateTransition();
    if (this.state === CircuitState.HALF_OPEN) {
      this.state = CircuitState.OPEN;
      this.lastStateChange = Date.now();
    } else if (this.state === CircuitState.CLOSED) {
      this.results.push({ timestamp: Date.now(), success: false });
      this.trimOldResults();
      this.checkThreshold();
    }
  }

  private trimOldResults() {
    const cutoff = Date.now() - this.config.samplingDurationMs;
    this.results = this.results.filter((r) => r.timestamp >= cutoff);
  }

  private checkThreshold() {
    if (this.results.length < this.config.minimumRequests) return;
    const failures = this.results.filter((r) => !r.success).length;
    const failureRate = (failures / this.results.length) * 100;
    if (failureRate >= this.config.failureThresholdPercentage) {
      this.state = CircuitState.OPEN;
      this.lastStateChange = Date.now();
    }
  }

  public async execute<T>(fn: () => Promise<T>): Promise<T> {
    const currentState = this.getState();
    if (currentState === CircuitState.OPEN) {
      throw new Error(`CircuitBreaker is OPEN. Requests temporarily blocked until reset window expires.`);
    }
    try {
      const res = await fn();
      this.recordSuccess();
      return res;
    } catch (err) {
      this.recordFailure();
      throw err;
    }
  }
}
