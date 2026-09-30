import { describe, expect, it, vi } from "vitest";
import { OpenRouterJevClient } from "./openRouterClient";

describe("OpenRouterJevClient", () => {
  it("uses the Decisions API with server-only bearer auth and configurable model", async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify({ answers: { check: { type: "score", score: 2, confidence: 0.9 } } })));
    const client = new OpenRouterJevClient("server-key", "custom-model", fetcher);

    await client.decide({ rounds: 2 }, { check: { type: "score", instructions: "Assess the pattern", criteria: ["none", "some", "clear"] } });

    expect(fetcher).toHaveBeenCalledWith("https://openrouter.ai/api/alpha/decisions", expect.objectContaining({
      method: "POST",
      headers: { Authorization: "Bearer server-key", "Content-Type": "application/json" },
      body: expect.stringContaining('"model":"custom-model"')
    }));
  });

  it("fails on provider errors and times out instead of waiting indefinitely", async () => {
    const failed = new OpenRouterJevClient("secret-key", "model", vi.fn<typeof fetch>().mockResolvedValue(new Response("", {
      status: 429,
      headers: { "x-request-id": "request-123" }
    })));
    const failure = failed.decide({}, {});
    await expect(failure).rejects.toThrow("HTTP 429 (request request-123)");
    await expect(failure).rejects.not.toThrow("secret-key");

    const stalledFetcher: typeof fetch = (_input, init) => new Promise((_resolve, reject) => {
      init?.signal?.addEventListener("abort", () => reject(new DOMException("Aborted", "AbortError")));
    });
    const timed = new OpenRouterJevClient("key", "model", stalledFetcher, 1);
    await expect(timed.decide({}, {})).rejects.toThrow("timed out");
  });
});
