import { describe, expect, it } from "vitest";

import { validateSoyuzBaseUrl } from "../scripts/validate-soyuz-url";
import { validateSoyuzRunId } from "../scripts/validate-soyuz-run-id";

describe("Soyuz base URL validation", () => {
  it("normalizes the configured Soyuz origin", () => {
    expect(validateSoyuzBaseUrl("https://soyuz.scheimann.workers.dev")).toBe(
      "https://soyuz.scheimann.workers.dev",
    );
    expect(validateSoyuzBaseUrl("https://soyuz.scheimann.workers.dev/")).toBe(
      "https://soyuz.scheimann.workers.dev",
    );
  });

  it.each([
    undefined,
    "",
    "https://soyuz.scheimann.workers.dev.evil.example",
    "http://soyuz.scheimann.workers.dev",
    "https://soyuz.scheimann.workers.dev/runs",
    "https://soyuz.scheimann.workers.dev?debug=true",
    "https://soyuz.scheimann.workers.dev#fragment",
    "https://user:password@soyuz.scheimann.workers.dev",
    " https://soyuz.scheimann.workers.dev",
  ])("rejects unsafe base URL %s", (value) => {
    expect(() => validateSoyuzBaseUrl(value)).toThrow(
      "SOYUZ_BASE_URL must be https://soyuz.scheimann.workers.dev",
    );
  });
});

describe("Soyuz run ID validation", () => {
  it("accepts a UUIDv7 run ID", () => {
    const runId = "018f2cce-0bce-7e4b-8b2e-6f2b7c2a1e12";

    expect(validateSoyuzRunId(runId)).toBe(runId);
  });

  it.each([
    undefined,
    "",
    "not-a-uuid",
    "018f2cce-0bce-4e4b-8b2e-6f2b7c2a1e12",
    "018f2cce-0bce-7e4b-7b2e-6f2b7c2a1e12",
    "018f2cce-0bce-7e4b-8b2e-6f2b7c2a1e1",
  ])("rejects invalid run ID %s", (runId) => {
    expect(() => validateSoyuzRunId(runId)).toThrow(
      "Soyuz returned an invalid UUIDv7 run ID",
    );
  });
});
