import { BudokonClient } from "../../api/budokon";
import { createBudokonSimulatorFetch } from "./simulator";
import { createFaultInjectingFetch } from "./faultInjection";
import { faultPlanForProfile } from "./faultProfiles";

export function createBudokonClient(): BudokonClient {
  const profile = import.meta.env.VITE_BUDOKON_FAULT_PROFILE || "503-once";
  let scenarioFetch: typeof fetch | undefined;
  const fetchWithFaults: typeof fetch = (input, init) => {
    scenarioFetch ??= createFaultInjectingFetch(
      createBudokonSimulatorFetch(),
      faultPlanForProfile(profile)
    );
    return scenarioFetch(input, init);
  };

  console.info(`[JU-DO-KON!] Local Budokon fault profile '${profile}' is active; no live API requests are made.`);

  return new BudokonClient(fetchWithFaults);
}
