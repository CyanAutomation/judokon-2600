import type { JevDecisionClient, JevDecisionResult, JevQuestion } from "./types";

const OPENROUTER_DECISIONS_URL = "https://openrouter.ai/api/alpha/decisions";
const DEFAULT_MODEL = "~typesafe/jev-latest";
const DEFAULT_TIMEOUT_MS = 3_500;

type Fetcher = typeof fetch;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** OpenRouter transport for JEV's typed Decisions API. */
export class OpenRouterJevClient implements JevDecisionClient {
  constructor(
    private readonly apiKey: string,
    private readonly model = DEFAULT_MODEL,
    private readonly fetcher: Fetcher = globalThis.fetch.bind(globalThis),
    private readonly timeoutMs = DEFAULT_TIMEOUT_MS
  ) {}

  async decide(state: unknown, questions: Record<string, JevQuestion>): Promise<JevDecisionResult> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await this.fetcher(OPENROUTER_DECISIONS_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ model: this.model, state, questions }),
        signal: controller.signal
      });

      if (!response.ok) {
        const requestId = response.headers.get("x-request-id");
        throw new Error(`JEV provider returned HTTP ${response.status}${requestId ? ` (request ${requestId})` : ""}`);
      }

      const body: unknown = await response.json();
      if (!isRecord(body) || !isRecord(body.answers)) throw new Error("JEV provider returned an invalid decision response");
      return { answers: body.answers as JevDecisionResult["answers"] };
    } catch (error) {
      if (typeof error === "object" && error !== null && (error as Record<string, unknown>).name === "AbortError") {
        throw new Error("JEV decision timed out");
      }
      throw error;
    } finally {
      clearTimeout(timeout);
    }
  }
}
