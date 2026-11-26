import { describe, expect, it } from "vitest";
import { BUDOKON_FAULT_PROFILE_NAMES, faultPlanForProfile } from "./faultProfiles";

describe("Budokon manual fault profiles", () => {
  it("provides named, one-shot profiles for outages, delays, and malformed responses", () => {
    expect(BUDOKON_FAULT_PROFILE_NAMES).toEqual([
      "503-once",
      "delay",
      "timeout",
      "network",
      "malformed-json",
      "invalid-shape"
    ]);
    expect(faultPlanForProfile("503-once")).toMatchObject([
      { kind: "response", status: 503 }
    ]);
    expect(faultPlanForProfile("timeout")).toMatchObject([{ kind: "delay", delayMs: 12_000 }]);
  });

  it("rejects unknown profile names with the available choices", () => {
    expect(() => faultPlanForProfile("production"))
      .toThrow("Unknown Budokon fault profile 'production'");
  });
});
