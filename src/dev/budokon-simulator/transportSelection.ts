export type BudokonTransport = "live" | "simulator" | "chaos";

/** Keep development-only transports out of every production build, including custom Vite modes. */
export function budokonTransportFor(command: string, mode: string): BudokonTransport {
  if (command !== "serve") return "live";
  if (mode === "simulator") return "simulator";
  if (mode === "chaos") return "chaos";
  return "live";
}
