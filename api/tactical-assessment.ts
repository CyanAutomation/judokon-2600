import { createHash } from "node:crypto";
import { getCache } from "@vercel/functions";
import { JevProviderError, OpenRouterJevClient } from "../src/jev/openRouterClient.js";
import type { JevDecisionClient } from "../src/jev/types.js";
import {
  applyTacticalConfidencePolicy,
  parseTacticalJudgment,
  sanitizeTacticalFeatures,
  TACTICAL_QUESTIONS,
  type TacticalFeatures
} from "../src/game/tacticalAssessment.js";

export interface TacticalAssessmentHandlerOptions {
  getApiKey?: () => string | undefined;
  getModel?: () => string | undefined;
  client?: JevDecisionClient;
  createClient?: (apiKey: string, model: string) => JevDecisionClient;
  cache?: TacticalAssessmentCache;
}

export interface TacticalAssessmentCache {
  get(key: string): Promise<unknown>;
  set(key: string, value: unknown, ttlSeconds: number): Promise<void>;
}

interface AssessmentResponse {
  status: number;
  body: unknown;
}

const MAX_REQUEST_BODY_BYTES = 8 * 1024;
const ASSESSMENT_CACHE_TTL_SECONDS = 300;
const ASSESSMENT_CACHE_VERSION = "v1";

class MemoryAssessmentCache implements TacticalAssessmentCache {
  private readonly values = new Map<string, { value: unknown; expiresAt: number }>();

  async get(key: string): Promise<unknown> {
    const entry = this.values.get(key);
    if (!entry) return undefined;
    if (entry.expiresAt <= Date.now()) {
      this.values.delete(key);
      return undefined;
    }
    return entry.value;
  }

  async set(key: string, value: unknown, ttlSeconds: number): Promise<void> {
    this.values.set(key, { value, expiresAt: Date.now() + ttlSeconds * 1_000 });
    while (this.values.size > 100) {
      const oldestKey = this.values.keys().next().value as string | undefined;
      if (oldestKey === undefined) break;
      this.values.delete(oldestKey);
    }
  }
}

function createDefaultAssessmentCache(): TacticalAssessmentCache {
  const memory = new MemoryAssessmentCache();
  if (process.env.VERCEL !== "1") return memory;

  return {
    async get(key) {
      try {
        const value = await getCache({ namespace: "judokon-tactical-assessments" }).get(key);
        return value ?? await memory.get(key);
      } catch {
        return memory.get(key);
      }
    },
    async set(key, value, ttlSeconds) {
      await memory.set(key, value, ttlSeconds);
      try {
        await getCache({ namespace: "judokon-tactical-assessments" }).set(key, value, {
          ttl: ttlSeconds,
          name: "tactical-assessment"
        });
      } catch {
        // Runtime Cache is unavailable outside supported Vercel environments.
      }
    }
  };
}

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

function assessmentCacheKey(features: TacticalFeatures, model: string): string {
  const digest = createHash("sha256").update(JSON.stringify([ASSESSMENT_CACHE_VERSION, model, features])).digest("hex");
  return `${ASSESSMENT_CACHE_VERSION}:${digest}`;
}

function isCachedAssessment(value: unknown): value is { assessment: unknown } {
  return typeof value === "object" && value !== null && !Array.isArray(value) &&
    Object.prototype.hasOwnProperty.call(value, "assessment");
}

function responseFrom(result: AssessmentResponse): Response {
  return json(result.body, result.status);
}

/** Create the Vercel route handler with injectable provider configuration for tests. */
export function createTacticalAssessmentHandler(options: TacticalAssessmentHandlerOptions = {}) {
  const cache = options.cache ?? createDefaultAssessmentCache();
  const inFlight = new Map<string, Promise<AssessmentResponse>>();

  return async function handleTacticalAssessment(request: Request): Promise<Response> {
    if (request.method !== "POST") return json({ assessment: null }, 405);

    const apiKey = (options.getApiKey ?? (() => process.env.OPENROUTER_API_KEY))()?.trim();
    if (!apiKey || apiKey.length === 0) return json({ assessment: null, issue: "not_configured" });

    const featureResult = await readTacticalFeatures(request);
    if (!featureResult.ok) return json({ assessment: null }, featureResult.status);

    const model = (options.getModel ?? (() => process.env.JEV_MODEL))()?.trim() || "~typesafe/jev-latest";
    const key = assessmentCacheKey(featureResult.features, model);
    try {
      const cached = await cache.get(key);
      if (isCachedAssessment(cached)) return json(cached);
    } catch {
      // A cache outage must not make the optional assessment unavailable.
    }

    const existing = inFlight.get(key);
    if (existing) return responseFrom(await existing);

    const pending = (async (): Promise<AssessmentResponse> => {
      const response = await runAssessment(featureResult.features, apiKey, {
        ...options,
        getModel: () => model
      });
      const result = { status: response.status, body: await response.json() };
      if (result.status === 200 && isCachedAssessment(result.body) && result.body.assessment !== null &&
        !(typeof result.body === "object" && result.body !== null && "issue" in result.body)) {
        try {
          await cache.set(key, result.body, ASSESSMENT_CACHE_TTL_SECONDS);
        } catch {
          // Preserve the response even when the cache write fails.
        }
      }
      return result;
    })();
    inFlight.set(key, pending);
    try {
      return responseFrom(await pending);
    } finally {
      if (inFlight.get(key) === pending) inFlight.delete(key);
    }
  };
}

const handler = createTacticalAssessmentHandler();

export default {
  fetch: handler
};
