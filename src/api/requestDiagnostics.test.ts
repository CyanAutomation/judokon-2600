import { describe, expect, it } from "vitest";
import { RequestDiagnostics } from "./requestDiagnostics";

describe("RequestDiagnostics", () => {
  it("aggregates durations and outcomes without retaining request or response data", () => {
    let now = 10;
    const diagnostics = new RequestDiagnostics(() => now);

    const successStart = diagnostics.start();
    now = 13;
    diagnostics.recordSuccess(successStart);
    const failureStart = diagnostics.start();
    now = 22;
    diagnostics.recordFailure(failureStart, "http", 503);

    expect(diagnostics.snapshot()).toEqual({
      attempts: 2,
      successes: 1,
      failures: 1,
      totalDurationMs: 12,
      lastDurationMs: 9,
      lastOutcome: "http",
      failureCounts: {
        network: 0,
        timeout: 0,
        http: 1,
        "invalid-response": 0,
        unknown: 0
      },
      httpFailureStatusCounts: { "503": 1 }
    });
  });

  it("returns an independent snapshot and clamps negative clock deltas", () => {
    let now = 20;
    const diagnostics = new RequestDiagnostics(() => now);
    const startedAt = diagnostics.start();
    now = 10;
    diagnostics.recordFailure(startedAt, "timeout");

    const snapshot = diagnostics.snapshot();
    snapshot.failureCounts.timeout = 99;
    snapshot.httpFailureStatusCounts["503"] = 99;

    expect(diagnostics.snapshot()).toMatchObject({
      attempts: 1,
      failures: 1,
      totalDurationMs: 0,
      lastDurationMs: 0,
      failureCounts: { timeout: 1 },
      httpFailureStatusCounts: {}
    });
  });

  it("preserves separate status counts for failed HTTP responses", () => {
    const diagnostics = new RequestDiagnostics(() => 1);
    const startedAt = diagnostics.start();
    diagnostics.recordFailure(startedAt, "http", 429);
    diagnostics.recordFailure(startedAt, "http", 503);

    expect(diagnostics.snapshot().httpFailureStatusCounts).toEqual({ "429": 1, "503": 1 });
  });
});
