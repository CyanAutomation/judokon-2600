import { afterEach, expect, it, vi } from "vitest";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

it("defers invalid fault profile errors until the first draw", async () => {
  vi.stubEnv("VITE_BUDOKON_FAULT_PROFILE", "unknown-profile");

  const { createBudokonClient } = await import("./chaosTransport");
  const client = createBudokonClient();

  await expect(client.drawBatch("bad-profile", 1)).rejects.toThrow(
    "Unknown Budokon fault profile 'unknown-profile'",
  );
  expect(client.getDiagnostics()).toMatchObject({
    attempts: 1,
    failures: 1,
    lastOutcome: "unknown",
    failureCounts: { unknown: 1 },
  });
});
