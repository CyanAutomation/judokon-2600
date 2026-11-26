export type RequestFailureCategory = "network" | "timeout" | "http" | "invalid-response" | "unknown";
export type RequestOutcome = "success" | RequestFailureCategory;

export interface RequestDiagnosticsSnapshot {
  attempts: number;
  successes: number;
  failures: number;
  totalDurationMs: number;
  lastDurationMs: number | null;
  lastOutcome: RequestOutcome | null;
  failureCounts: Record<RequestFailureCategory, number>;
  httpFailureStatusCounts: Record<string, number>;
}

const FAILURE_CATEGORIES: readonly RequestFailureCategory[] = [
  "network",
  "timeout",
  "http",
  "invalid-response",
  "unknown"
];

function defaultClock(): number {
  return globalThis.performance?.now?.() ?? Date.now();
}

/** Aggregate request outcomes and timing without retaining request or response contents. */
export class RequestDiagnostics {
  private attempts = 0;
  private successes = 0;
  private failures = 0;
  private totalDurationMs = 0;
  private lastDurationMs: number | null = null;
  private lastOutcome: RequestOutcome | null = null;
  private readonly failureCounts = Object.fromEntries(
    FAILURE_CATEGORIES.map(category => [category, 0])
  ) as Record<RequestFailureCategory, number>;
  private readonly httpFailureStatusCounts: Record<string, number> = {};

  constructor(private readonly clock: () => number = defaultClock) {}

  start(): number {
    return this.clock();
  }

  recordSuccess(startedAt: number): void {
    this.recordDuration(startedAt);
    this.successes += 1;
    this.lastOutcome = "success";
  }

  recordFailure(startedAt: number, category: RequestFailureCategory, status?: number): void {
    this.recordDuration(startedAt);
    this.failures += 1;
    this.failureCounts[category] += 1;
    this.lastOutcome = category;
    if (status !== undefined) {
      const key = String(status);
      this.httpFailureStatusCounts[key] = (this.httpFailureStatusCounts[key] ?? 0) + 1;
    }
  }

  snapshot(): RequestDiagnosticsSnapshot {
    return {
      attempts: this.attempts,
      successes: this.successes,
      failures: this.failures,
      totalDurationMs: this.totalDurationMs,
      lastDurationMs: this.lastDurationMs,
      lastOutcome: this.lastOutcome,
      failureCounts: { ...this.failureCounts },
      httpFailureStatusCounts: { ...this.httpFailureStatusCounts }
    };
  }

  private recordDuration(startedAt: number): void {
    const elapsed = Math.max(0, this.clock() - startedAt);
    this.attempts += 1;
    this.totalDurationMs += elapsed;
    this.lastDurationMs = elapsed;
  }
}
