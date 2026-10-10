import { checkRateLimit } from "@vercel/firewall";
import { JevProviderError, OpenRouterJevClient } from "../src/jev/openRouterClient";
import type { JevDecisionClient } from "../src/jev/types";
import {
  applyTacticalConfidencePolicy,
  parseTacticalJudgment,
  sanitizeTacticalFeatures,
  TACTICAL_QUESTIONS,
  type TacticalFeatures
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

type BodyBytes =
  | { ok: true; bytes: Uint8Array }
  | { ok: false; status: 400 | 413 };

function contentLengthError(header: string | null): 400 | 413 | null {
  if (header === null) return null;
  if (!/^\d+$/.test(header)) return 400;
  const contentLength = Number(header);
  if (!Number.isSafeInteger(contentLength)) return 400;
  return contentLength > MAX_REQUEST_BODY_BYTES ? 413 : null;
}

async function readBoundedBody(request: Request): Promise<BodyBytes> {
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
  return { ok: true, bytes };
}

async function parseJsonBody(request: Request): Promise<ParsedBody> {
  const lengthError = contentLengthError(request.headers.get("content-length"));
  if (lengthError) return { ok: false, status: lengthError };
  const body = await readBoundedBody(request);
  if (!body.ok) return body;
  try {
    const value = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(body.bytes));
    return { ok: true, value };
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

async function rateLimitResponse(
  request: Request,
  options: TacticalAssessmentHandlerOptions
): Promise<Response | null> {
  try {
    const isRateLimited = await (options.isRateLimited ?? checkVercelRateLimit)(request);
    return isRateLimited ? json({ assessment: null, issue: "rate_limited" }, 429) : null;
  } catch {
    // A missing or unavailable firewall rule must never make the public route fail open.
    return json({ assessment: null }, 503);
  }
}

async function readTacticalFeatures(request: Request): Promise<
  | { ok: true; features: TacticalFeatures }
  | { ok: false; status: 400 | 413 }
> {
  const parsedBody = await parseJsonBody(request);
  if (!parsedBody.ok) return parsedBody;
  const candidate = typeof parsedBody.value === "object" && parsedBody.value !== null && !Array.isArray(parsedBody.value)
    ? (parsedBody.value as Record<string, unknown>).features
    : null;
  const features = sanitizeTacticalFeatures(candidate);
  return features ? { ok: true, features } : { ok: false, status: 400 };
}

async function runAssessment(
  features: TacticalFeatures,
  apiKey: string,
  options: TacticalAssessmentHandlerOptions
): Promise<Response> {
  const model = (options.getModel ?? (() => process.env.JEV_MODEL))()?.trim() || "~typesafe/jev-latest";
  const client = options.client ?? (options.createClient ?? ((key, selectedModel) => new OpenRouterJevClient(key, selectedModel)))(apiKey, model);

  try {
    const result = await client.decide(features, TACTICAL_QUESTIONS);
    const judgment = parseTacticalJudgment(result);
    if (!judgment) return json({ assessment: null }, 502);
    return json({ assessment: applyTacticalConfidencePolicy(judgment) });
  } catch (error) {
    // JEV is optional; never forward provider details or affect game state.
    const issue = error instanceof JevProviderError && (error.status === 401 || error.status === 403)
      ? "invalid_api_key"
      : "unavailable";
    return json({ assessment: null, issue }, 503);
  }
}

/** Create the Vercel route handler with injectable provider configuration for tests. */
export function createTacticalAssessmentHandler(options: TacticalAssessmentHandlerOptions = {}) {
  return async function handleTacticalAssessment(request: Request): Promise<Response> {
    if (request.method !== "POST") return json({ assessment: null }, 405);

    const apiKey = (options.getApiKey ?? (() => process.env.OPENROUTER_API_KEY))()?.trim();
    const limitResponse = await rateLimitResponse(request, options);
    if (limitResponse) return limitResponse;

    const featureResult = await readTacticalFeatures(request);
    if (!featureResult.ok) return json({ assessment: null }, featureResult.status);

    if (!apiKey || apiKey.length === 0) return json({ assessment: null, issue: "not_configured" });
    return runAssessment(featureResult.features, apiKey, options);
  };
}

const handler = createTacticalAssessmentHandler();

export default {
  fetch: handler
};
