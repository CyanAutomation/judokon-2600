export type BudokonTransport = "live" | "simulator";

/** Keep simulator imports out of every production build, including custom Vite modes. */
export function budokonTransportFor(command: string, mode: string): BudokonTransport {
  return command === "serve" && mode === "simulator" ? "simulator" : "live";
}

