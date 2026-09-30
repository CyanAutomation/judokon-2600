import { describe, expect, it, vi } from "vitest";
import { createTacticalAssessmentHandler } from "../../api/tactical-assessment";
import type { JevDecisionResult } from "../jev/types";
import type { MatchHistoryItem } from "../game/game";
import { extractTacticalFeatures } from "../game/tacticalAssessment";
import { requestTacticalAssessment } from "./tacticalAssessment";

const rounds: MatchHistoryItem[] = [
  { stat: "power", outcome: "opponent" },
  { stat: "technique", outcome: "player" },
  { stat: "technique", outcome: "player" }
];

const features = extractTacticalFeatures(
  { player: 2, opponent: 1 },
  rounds
);

function request(body: unknown): Request {
  return new Request("https://judokon.example/api/tactical-assessment", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
}

function providerResult(score = 2, confidence = 0.9): JevDecisionResult {
  const answers = Object.fromEntries(["overReliance", "adaptation", "missedOpportunity", "momentumResponse"].map((signal) => [signal, { type: "score" as const, score, confidence }]));
  return { answers };
}

describe("tactical assessment API route", () => {
  it("returns deterministic-summary fallback without an API key", async () => {
    const client = { decide: vi.fn() };
    const handler = createTacticalAssessmentHandler({ getApiKey: () => undefined, client });

    const response = await handler(request({ features }));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ assessment: null });
    expect(client.decide).not.toHaveBeenCalled();
  });

  it("does not construct a provider client for a whitespace-only API key", async () => {
    const createClient = vi.fn();
    const handler = createTacticalAssessmentHandler({ getApiKey: () => "   \t", createClient });

    const response = await handler(request({ features }));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ assessment: null });
    expect(createClient).not.toHaveBeenCalled();
  });

  it("passes only allow-listed match features to the injected JEV client", async () => {
    let receivedState: unknown;
    const client = { decide: vi.fn(async (state: unknown) => {
      receivedState = state;
      return providerResult();
    }) };
    const handler = createTacticalAssessmentHandler({ getApiKey: () => "test-key", client });
    const response = await handler(request({
      features,
      opponent: { stats: { power: 999, hidden: "secret" } },
      replaySeed: "private-seed"
    }));

    expect(response.status).toBe(200);
    expect(receivedState).toEqual(features);
    expect(JSON.stringify(receivedState)).not.toMatch(/hidden|secret|999|private-seed/);
    expect(client.decide).toHaveBeenCalledOnce();
  });

  it("returns no insight for low confidence and degrades provider errors", async () => {
    const lowConfidence = createTacticalAssessmentHandler({
      getApiKey: () => "test-key",
      client: { decide: vi.fn(async () => providerResult(2, 0.2)) }
    });
    const low = await lowConfidence(request({ features }));
    expect(await low.json()).toEqual({ assessment: null });

    const failed = createTacticalAssessmentHandler({
      getApiKey: () => "test-key",
      client: { decide: vi.fn(async () => { throw new Error("provider timeout"); }) }
    });
    expect((await failed(request({ features }))).status).toBe(503);
  });

  it("rejects malformed provider answers and invalid request shapes", async () => {
    const malformed = createTacticalAssessmentHandler({
      getApiKey: () => "test-key",
      client: { decide: vi.fn(async () => ({ answers: { overReliance: { type: "noul", noul: 1 } } } as unknown as JevDecisionResult)) }
    });
    expect((await malformed(request({ features }))).status).toBe(502);

    const disabled = createTacticalAssessmentHandler({ getApiKey: () => undefined });
    expect((await disabled(request({ features: { ...features, rounds: 50 } }))).status).toBe(400);
    expect((await disabled(new Request("https://judokon.example/api/tactical-assessment", { method: "GET" }))).status).toBe(405);
  });
});

describe("browser assessment client", () => {
  it("sends only compact features and treats route failure as no insight", async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(Response.json({ assessment: { missedOpportunity: true } }));
    const assessment = await requestTacticalAssessment(features, fetcher);
    expect(assessment).toEqual({ missedOpportunity: true });

    const body = JSON.parse(String(fetcher.mock.calls[0]?.[1]?.body)) as Record<string, unknown>;
    expect(body).toEqual({ features });
    expect(JSON.stringify(body)).not.toMatch(/replaySeed|opponentValue|opponent\.stats|power.*999/);

    await expect(requestTacticalAssessment(features, vi.fn<typeof fetch>().mockResolvedValue(new Response("", { status: 503 })))).resolves.toBeNull();
    await expect(requestTacticalAssessment(features, vi.fn<typeof fetch>().mockRejectedValue(new Error("offline")))).resolves.toBeNull();
  });
});
