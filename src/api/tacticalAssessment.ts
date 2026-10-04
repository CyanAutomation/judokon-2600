import type { TacticalAssessment, TacticalAssessmentIssue, TacticalAssessmentResult, TacticalFeatures } from "../game/tacticalAssessment";

type Fetcher = typeof fetch;

function isAssessment(value: unknown): value is TacticalAssessment {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
  const entries = Object.entries(value);
  const allowed = new Set(["overReliance", "adaptation", "missedOpportunity", "momentumResponse"]);
  return entries.length > 0 && entries.every(([key, enabled]) => allowed.has(key) && enabled === true);
}

function isIssue(value: unknown): value is TacticalAssessmentIssue {
  return value === "not_configured" || value === "invalid_api_key" || value === "rate_limited" || value === "unavailable";
}

/** Calls the same-origin optional assessment route. Every failure preserves the deterministic match summary. */
export async function requestTacticalAssessment(
  features: TacticalFeatures,
  fetcher: Fetcher = globalThis.fetch.bind(globalThis)
): Promise<TacticalAssessmentResult> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5_000);
  try {
    const response = await fetcher("/api/tactical-assessment", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ features }),
      signal: controller.signal
    });
    const body: unknown = await response.json();
    if (typeof body !== "object" || body === null || Array.isArray(body)) {
      return { assessment: null, issue: "unavailable" };
    }
    const record = body as Record<string, unknown>;
    if (isAssessment(record.assessment)) return { assessment: record.assessment };
    if (isIssue(record.issue)) return { assessment: null, issue: record.issue };
    if (!response.ok) return { assessment: null, issue: "unavailable" };
    return { assessment: null };
  } catch {
    return { assessment: null, issue: "unavailable" };
  } finally {
    clearTimeout(timeout);
  }
}
