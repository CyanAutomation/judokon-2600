import { OpenRouterJevClient } from "../src/jev/openRouterClient";
import type { JevDecisionClient } from "../src/jev/types";
import {
  assessmentFromJev,
  parseTacticalJudgment,
  sanitizeTacticalFeatures,
  TACTICAL_QUESTIONS
} from "../src/game/tacticalAssessment";

export interface TacticalAssessmentHandlerOptions {
  getApiKey?: () => string | undefined;
  getModel?: () => string | undefined;
  client?: JevDecisionClient;
  createClient?: (apiKey: string, model: string) => JevDecisionClient;
}

function json(body: unknown, status = 200): Response {
  return Response.json(body, {
    status,
    headers: { "Cache-Control": "no-store" }
  });
}

/** Create the Vercel route handler with injectable provider configuration for tests. */
export function createTacticalAssessmentHandler(options: TacticalAssessmentHandlerOptions = {}) {
  return async function handleTacticalAssessment(request: Request): Promise<Response> {
    if (request.method !== "POST") return json({ assessment: null }, 405);

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return json({ assessment: null }, 400);
    }

    const candidate = typeof body === "object" && body !== null && !Array.isArray(body)
      ? (body as Record<string, unknown>).features
      : null;
    const features = sanitizeTacticalFeatures(candidate);
    if (!features) return json({ assessment: null }, 400);

    const apiKey = (options.getApiKey ?? (() => process.env.OPENROUTER_API_KEY))()?.trim();
    if (!apiKey) return json({ assessment: null });

    const model = (options.getModel ?? (() => process.env.JEV_MODEL))()?.trim() || "~typesafe/jev-latest";
    const client = options.client ?? (options.createClient ?? ((key, selectedModel) => new OpenRouterJevClient(key, selectedModel)))(apiKey, model);

    try {
      const result = await client.decide(features, TACTICAL_QUESTIONS);
      if (!parseTacticalJudgment(result)) return json({ assessment: null }, 502);
      return json({ assessment: assessmentFromJev(result) });
    } catch {
      // JEV is optional; never forward provider details or affect game state.
      return json({ assessment: null }, 503);
    }
  };
}

const handler = createTacticalAssessmentHandler();

export default {
  fetch: handler
};
