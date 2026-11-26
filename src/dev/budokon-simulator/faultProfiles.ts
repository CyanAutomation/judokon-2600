import type { BudokonFaultPlan } from "./faultInjection";

export const BUDOKON_FAULT_PROFILE_NAMES = [
  "503-once",
  "delay",
  "timeout",
  "network",
  "malformed-json",
  "invalid-shape"
] as const;

export type BudokonFaultProfileName = (typeof BUDOKON_FAULT_PROFILE_NAMES)[number];

const FAULT_PROFILES: Record<BudokonFaultProfileName, BudokonFaultPlan> = {
  "503-once": [{
    kind: "response",
    status: 503,
    body: JSON.stringify({ error: { code: "simulated_unavailable", message: "Simulated temporary outage." } })
  }],
  delay: [{ kind: "delay", delayMs: 1_500 }],
  timeout: [{ kind: "delay", delayMs: 12_000 }],
  network: [{ kind: "network-error" }],
  "malformed-json": [{ kind: "response", status: 200, body: "{ malformed JSON" }],
  "invalid-shape": [{ kind: "response", status: 200, body: JSON.stringify({ judoka: [] }) }]
};

export function faultPlanForProfile(name: string): BudokonFaultPlan {
  if (!Object.hasOwn(FAULT_PROFILES, name)) {
    throw new Error(`Unknown Budokon fault profile '${name}'. Choose: ${BUDOKON_FAULT_PROFILE_NAMES.join(", ")}.`);
  }
  return FAULT_PROFILES[name as BudokonFaultProfileName];
}
