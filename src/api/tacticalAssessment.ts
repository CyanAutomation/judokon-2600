import type { TacticalAssessment, TacticalFeatures } from "../game/tacticalAssessment";

type Fetcher = typeof fetch;

function isAssessment(value: unknown): value is TacticalAssessment {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
  const entries = Object.entries(value);
  const allowed = new Set(["overReliance", "adaptation", "missedOpportunity", "momentumResponse"]);
  return entries.length > 0 && entries.every(([key, enabled]) => allowed.has(key) && enabled === true);
}

/** Calls the same-origin optional assessment route. Every failure degrades to no insight. */
export async function requestTacticalAssessment(
  features: TacticalFeatures,
  fetcher: Fetcher = globalThis.fetch.bind(globalThis)
): Promise<TacticalAssessment | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5_000);
  try {
    const response = await fetcher("/api/tactical-assessment", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ features }),
      signal: controller.signal
    });
    if (!response.ok) return null;
    const body: unknown = await response.json();
    if (typeof body !== "object" || body === null || Array.isArray(body)) return null;
    return isAssessment((body as Record<string, unknown>).assessment) ? (body as { assessment: TacticalAssessment }).assessment : null;
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}
