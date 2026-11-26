import { BudokonClient } from "../../api/budokon";
import { createBudokonSimulatorFetch } from "./simulator";
import { createFaultInjectingFetch } from "./faultInjection";
import { faultPlanForProfile } from "./faultProfiles";

const profile = import.meta.env.VITE_BUDOKON_FAULT_PROFILE || "503-once";
const scenarioFetch = createFaultInjectingFetch(
  createBudokonSimulatorFetch(),
  faultPlanForProfile(profile)
);

console.info(`[JU-DO-KON!] Local Budokon fault profile '${profile}' is active; no live API requests are made.`);

export function createBudokonClient(): BudokonClient {
  return new BudokonClient(scenarioFetch);
}
