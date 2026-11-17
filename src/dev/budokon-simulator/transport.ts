import { BudokonClient } from "../../api/budokon";
import { createBudokonSimulatorFetch } from "./simulator";

console.info("[JU-DO-KON!] Simulated Budokon draw data is active (ju-do-kon-sim-fixtures-v1).");

const simulatorFetch = createBudokonSimulatorFetch();

export function createBudokonClient(): BudokonClient {
  return new BudokonClient(simulatorFetch);
}

