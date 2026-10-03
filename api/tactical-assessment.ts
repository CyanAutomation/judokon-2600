import { checkRateLimit } from "@vercel/firewall";
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
  isRateLimited?: (request: Request) => Promise<boolean>;
  client?: JevDecisionClient;
  createClient?: (apiKey: string, model: string) => JevDecisionClient;
}

const MAX_REQUEST_BODY_BYTES = 8 * 1024;

function json(body: unknown, status = 200): Response {
  return Response.json(body, {
    status,
    headers: { "Cache-Control": "no-store" }
  });
}

type ParsedBody =
  | { ok: true; value: unknown }
  | { ok: false; status: 400 | 413 };

async function parseJsonBody(request: Request): Promise<ParsedBody> {
  const contentLengthHeader = request.headers.get("content-length");
  if (contentLengthHeader !== null) {
    if (!/^\d+$/.test(contentLengthHeader)) return { ok: false, status: 400 };
    const contentLength = Number(contentLengthHeader);
    if (!Number.isSafeInteger(contentLength) || contentLength < 0) return { ok: false, status: 400 };
    if (contentLength > MAX_REQUEST_BODY_BYTES) return { ok: false, status: 413 };
  }

  if (!request.body) return { ok: false, status: 400 };

  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let totalBytes = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      totalBytes += value.byteLength;
      if (totalBytes > MAX_REQUEST_BODY_BYTES) {
        await reader.cancel().catch(() => undefined);
        return { ok: false, status: 413 };
      }
      chunks.push(value);
    }
  } catch {
    return { ok: false, status: 400 };
  } finally {
    reader.releaseLock();
  }

  const bytes = new Uint8Array(totalBytes);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }

  try {
    return { ok: true, value: JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes)) };
  } catch {
    return { ok: false, status: 400 };
  }
}

async function checkVercelRateLimit(request: Request): Promise<boolean> {
  const rateLimitId = process.env.JEV_ASSESSMENT_RATE_LIMIT_ID?.trim();
  if (!rateLimitId) throw new Error("JEV_ASSESSMENT_RATE_LIMIT_ID is not configured");

  const result = await checkRateLimit(rateLimitId, { request });
  if (result.error) throw new Error(`Vercel Firewall rate limit failed: ${result.error}`);
  return result.rateLimited;
}

/** Create the Vercel route handler with injectable provider configuration for tests. */
export function createTacticalAssessmentHandler(options: TacticalAssessmentHandlerOptions = {}) {
  return async function handleTacticalAssessment(request: Request): Promise<Response> {
    if (request.method !== "POST") return json({ assessment: null }, 405);

    const apiKey = (options.getApiKey ?? (() => process.env.OPENROUTER_API_KEY))()?.trim();
    if (apiKey) {
      try {
        const isRateLimited = await (options.isRateLimited ?? checkVercelRateLimit)(request);
        if (isRateLimited) return json({ assessment: null }, 429);
      } catch {
        // A missing or unavailable firewall rule must never make the paid route fail open.
        return json({ assessment: null }, 503);
      }
    }

    const parsedBody = await parseJsonBody(request);
    if (!parsedBody.ok) return json({ assessment: null }, parsedBody.status);

    const candidate = typeof parsedBody.value === "object" && parsedBody.value !== null && !Array.isArray(parsedBody.value)
      ? (parsedBody.value as Record<string, unknown>).features
      : null;
    const features = sanitizeTacticalFeatures(candidate);
    if (!features) return json({ assessment: null }, 400);

    if (!apiKey || apiKey.length === 0) return json({ assessment: null });

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
