import { describe, expect, it } from "vitest";

import {
  createKasekiIdempotencyKey,
  createUuidV5,
} from "../scripts/kaseki-idempotency-key.mjs";

describe("Kaseki idempotency keys", () => {
  it("creates a stable UUIDv5 for the same GitHub Actions run", () => {
    const run = {
      repository: "CyanAutomation/judokon-2600",
      workflow: "Kaseki Docs Sweep",
      runId: "123456789",
    };

    const first = createKasekiIdempotencyKey(run);
    const second = createKasekiIdempotencyKey(run);

    expect(first).toBe(second);
    expect(first).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-5[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
    );
  });

  it("creates a different key for each workflow and run", () => {
    const run = {
      repository: "CyanAutomation/judokon-2600",
      workflow: "Kaseki Docs Sweep",
      runId: "123456789",
    };

    expect(createKasekiIdempotencyKey(run)).not.toBe(
      createKasekiIdempotencyKey({ ...run, workflow: "Kaseki DRY Sweep" }),
    );
    expect(createKasekiIdempotencyKey(run)).not.toBe(
      createKasekiIdempotencyKey({ ...run, runId: "123456790" }),
    );
  });

  it("matches the RFC UUIDv5 example for www.example.com", () => {
    expect(
      createUuidV5("6ba7b810-9dad-11d1-80b4-00c04fd430c8", "www.example.com"),
    ).toBe("2ed6657d-e927-568b-95e1-2665a8aea6a2");
  });

  it("requires the repository, workflow, and run ID", () => {
    expect(() =>
      createKasekiIdempotencyKey({
        repository: "CyanAutomation/judokon-2600",
        workflow: "",
        runId: "123456789",
      }),
    ).toThrow("repository, workflow, and runId are required");
  });
});
