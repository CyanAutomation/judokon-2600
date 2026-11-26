import { describe, expect, it, vi } from "vitest";
import { BudokonClient } from "./budokon";

const judoka = [
  { id: "a", slug: "a", firstname: "A", surname: "A", country: "Japan", countryCode: "JP", weightClass: "-60", stats: { power: 1, speed: 2, technique: 3, kumikata: 4, newaza: 5 } },
  { id: "b", slug: "b", firstname: "B", surname: "B", country: "France", countryCode: "FR", weightClass: "-66", stats: { power: 5, speed: 4, technique: 3, kumikata: 2, newaza: 1 } }
];

// Request-shape compatibility follows the public API contract: https://budokon.scheimann.workers.dev/docs
it("requests a batch with the count and replay seed required by the API contract", async () => {
  let requestBody: unknown;
  const fetcher = vi.fn((_url: string, init?: RequestInit) => {
    const body = init?.body;
    requestBody = typeof body === "string" ? JSON.parse(body) : undefined;
    return Promise.resolve(new Response(JSON.stringify({ judoka }), { status: 200 }));
  }) as unknown as typeof fetch;

  await new BudokonClient(fetcher).drawBatch("known-seed", 2);

  expect(requestBody).toEqual(expect.objectContaining({ count: 2, seed: "known-seed" }));
});

it("accepts the versioned draw envelope and additive canonical judoka fields", async () => {
  const canonicalJudoka = judoka.map((record, index) => ({
    ...record,
    category: "Judo",
    rarity: index === 0 ? "Rare" : "Epic",
    isHidden: false,
    profileUrl: `https://example.test/judoka/${record.slug}`,
    aliases: [`${record.firstname} ${record.surname}`],
  }));
  const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify({
    datasetVersion: "2026.08.1",
    algorithm: "budokon-v1",
    seed: "known-seed",
    poolSize: 2,
    judoka: canonicalJudoka,
  }), { status: 200 }));

  await expect(new BudokonClient(fetcher).drawBatch("known-seed", 2)).resolves.toEqual(canonicalJudoka);
});

it("reuses an in-flight or completed deterministic draw instead of issuing another API call", async () => {
  const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify({ judoka }), { status: 200 }));
  const client = new BudokonClient(fetcher);

  await Promise.all([client.drawBatch("known-seed", 2), client.drawBatch("known-seed", 2)]);
  await client.drawBatch("known-seed", 2);

  expect(fetcher).toHaveBeenCalledTimes(1);
});

it("canonicalizes optional values and exclusions for the request and cache", async () => {
  const fetcher = vi.fn((...args: Parameters<typeof fetch>) => {
    void args;
    return Promise.resolve(new Response(JSON.stringify({ judoka }), { status: 200 }));
  });
  const client = new BudokonClient(fetcher);

  await client.drawBatch("known-seed", 2, "", ["b", "a", "b"]);
  await client.drawBatch("known-seed", 2, undefined, ["a", "b"]);
  await client.drawBatch("known-seed", 2, undefined, []);
  await client.drawBatch("known-seed", 2);

  expect(fetcher).toHaveBeenCalledTimes(2);
  const canonicalRequest = fetcher.mock.calls[0]?.[1] as RequestInit;
  expect(JSON.parse(canonicalRequest.body as string)).toEqual({
    count: 2,
    seed: "known-seed",
    exclude: ["a", "b"]
  });
  const emptyRequest = fetcher.mock.calls[1]?.[1] as RequestInit;
  expect(JSON.parse(emptyRequest.body as string)).toEqual({ count: 2, seed: "known-seed" });
});

it("keeps genuinely different normalized draws in separate cache entries", async () => {
  const fetcher = vi.fn(() => Promise.resolve(new Response(JSON.stringify({ judoka }), { status: 200 })));
  const client = new BudokonClient(fetcher);

  await client.drawBatch("seed-a", 2, undefined, ["a"]);
  await client.drawBatch("seed-b", 2, undefined, ["a"]);
  await client.drawBatch("seed-a", 2, "-81", ["a"]);
  await client.drawBatch("seed-a", 2, undefined, ["b"]);

  expect(fetcher).toHaveBeenCalledTimes(4);
});

it("returns deep copies without exposing the cached deterministic draw", async () => {
  const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify({ judoka }), { status: 200 }));
  const client = new BudokonClient(fetcher);

  const first = await client.drawBatch("known-seed", 2);
  first.shift();
  first.reverse();

  const mutableFirst = await client.drawBatch("known-seed", 2);
  mutableFirst[0]!.firstname = "Mutated";
  mutableFirst[0]!.stats.power = 99;

  const second = await client.drawBatch("known-seed", 2);

  expect(second).toEqual(judoka);
  expect(second).not.toBe(first);
  expect(second[0]).not.toBe(mutableFirst[0]);
  expect(second[0]!.stats).not.toBe(mutableFirst[0]!.stats);
  expect(fetcher).toHaveBeenCalledTimes(1);
});

describe("rarity response validation", () => {
  // The game tolerates missing rarity in older fixtures/responses even though the current API contract requires it.
  it.each([
    { scenario: "valid string rarity", rarity: "Rare", outcome: "accepted" },
    { scenario: "omitted rarity", outcome: "accepted" },
    { scenario: "invalid non-string rarity", rarity: 1, outcome: "rejected" }
  ] as const)("$scenario", async ({ rarity, outcome }) => {
    const firstJudoka = rarity === undefined ? { ...judoka[0] } : { ...judoka[0], rarity };
    const responseJudoka = [firstJudoka, judoka[1]];
    const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify({ judoka: responseJudoka }), { status: 200 }));
    const request = new BudokonClient(fetcher).drawBatch("known-seed", 2);

    if (outcome === "rejected") {
      await expect(request).rejects.toThrow("Budokon API returned an invalid response");
      return;
    }

    await expect(request).resolves.toEqual(responseJudoka);
  });
});
it("constrains a draw to a requested weight class", async () => {
  const judoka = [
    { id: "a", slug: "a", firstname: "A", surname: "A", country: "Japan", countryCode: "JP", weightClass: "-81", stats: { power: 1, speed: 2, technique: 3, kumikata: 4, newaza: 5 } },
    { id: "b", slug: "b", firstname: "B", surname: "B", country: "France", countryCode: "FR", weightClass: "-81", stats: { power: 5, speed: 4, technique: 3, kumikata: 2, newaza: 1 } }
  ];
  const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify({ judoka }), { status: 200 }));
  const pair = await new BudokonClient(fetcher).drawBatch("known-seed", 2, "-81");
  const request = fetcher.mock.calls[0]?.[1] as RequestInit;
  const body = JSON.parse(request.body as string);
  expect(body.filters.weightClass).toBe("-81");
  expect(pair).toEqual(judoka);
});
it("draws one new opponent while excluding the Champion and last opponent", async () => {
  const championId = "champion-id";
  const lastOpponentId = "last-opponent-id";
  const drawn = { id: "c", slug: "c", firstname: "C", surname: "C", country: "Japan", countryCode: "JP", weightClass: "-60", stats: { power: 1, speed: 2, technique: 3, kumikata: 4, newaza: 5 } };
  const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify({ judoka: [drawn] }), { status: 200 }));
  await expect(new BudokonClient(fetcher).drawOpponent("round-2", [championId, lastOpponentId])).resolves.toMatchObject({ id: "c" });

  const request = fetcher.mock.calls[0]?.[1] as RequestInit;
  const body = JSON.parse(request.body as string);
  expect(body.count).toBe(1);
  expect(body.exclude).toEqual(expect.arrayContaining([championId, lastOpponentId]));
});
describe("HTTP status handling", () => {
  it("explains when the Budokon service is temporarily unavailable", async () => {
    const client = new BudokonClient(vi.fn().mockResolvedValue(new Response("nope", { status: 503 })));
    await expect(client.drawBatch("seed", 2)).rejects.toThrow("Budokon API is temporarily unavailable (HTTP 503)");
  });

  it("explains rate limiting and records the failed HTTP status", async () => {
    const client = new BudokonClient(vi.fn().mockResolvedValue(new Response("rate limited", { status: 429 })));

    await expect(client.drawBatch("rate-limited", 2)).rejects.toThrow("Too many draw requests");
    expect(client.getDiagnostics()).toMatchObject({
      attempts: 1,
      failures: 1,
      lastOutcome: "http",
      failureCounts: { http: 1 },
      httpFailureStatusCounts: { "429": 1 }
    });
  });

  it("explains when Budokon rejects access or its endpoint is missing", async () => {
    const denied = new BudokonClient(vi.fn().mockResolvedValue(new Response("nope", { status: 403 })));
    const missing = new BudokonClient(vi.fn().mockResolvedValue(new Response("nope", { status: 404 })));

    await expect(denied.drawBatch("denied", 2)).rejects.toThrow("Budokon API access was denied (HTTP 403)");
    await expect(missing.drawBatch("missing", 2)).rejects.toThrow("Budokon API endpoint is unavailable");
  });

  it("explains when a selected division has no compatible pair", async () => {
    const client = new BudokonClient(vi.fn().mockResolvedValue(new Response("nope", { status: 409 })));
    await expect(client.drawBatch("seed", 2, "-81")).rejects.toThrow("No compatible -81 kg pair is available");
  });

  it("reports a generic conflict for an unfiltered draw", async () => {
    const client = new BudokonClient(vi.fn().mockResolvedValue(new Response("nope", { status: 409 })));
    await expect(client.drawBatch("seed", 2)).rejects.toThrow("Budokon API could not complete this draw (HTTP 409)");
  });
});
it("rejects a response that omits a battle stat", async () => {
  const incomplete = { id: "a", slug: "a", firstname: "A", surname: "A", country: "Japan", countryCode: "JP", weightClass: "-60", stats: { power: 1 } };
  const client = new BudokonClient(vi.fn().mockResolvedValue(new Response(JSON.stringify({ judoka: [incomplete, incomplete] }), { status: 200 })));
  await expect(client.drawBatch("seed", 2)).rejects.toThrow("Budokon API returned an invalid response");
});
it("times out an unresponsive draw request", async () => {
  vi.useFakeTimers();
  try {
    const fetcher = vi.fn((_url: string, options: RequestInit) => new Promise<Response>((_resolve, reject) => {
      options.signal?.addEventListener("abort", () => reject(new DOMException("Aborted", "AbortError")));
    })) as unknown as typeof fetch;
    const client = new BudokonClient(fetcher, 1);
    const request = client.drawBatch("seed", 2);
    const expectation = expect(request).rejects.toThrow("Budokon API request timed out");
    await vi.advanceTimersByTimeAsync(1);
    await expectation;
    expect(client.getDiagnostics()).toMatchObject({
      attempts: 1,
      failures: 1,
      lastOutcome: "timeout",
      failureCounts: { timeout: 1 }
    });
  } finally {
    vi.useRealTimers();
  }
});

it("uses a timeout signal and explains its TimeoutError", async () => {
  const timeoutSignal = new AbortController().signal;
  const timeoutSpy = vi.spyOn(AbortSignal, "timeout").mockReturnValue(timeoutSignal);
  let requestSignal: AbortSignal | null | undefined;
  const fetcher = vi.fn((_url: string, options: RequestInit) => {
    requestSignal = options.signal;
    return Promise.reject(new DOMException("The operation timed out", "TimeoutError"));
  }) as unknown as typeof fetch;

  try {
    await expect(new BudokonClient(fetcher, 1).drawBatch("seed", 2))
      .rejects.toThrow("Budokon API request timed out");
    expect(timeoutSpy).toHaveBeenCalledWith(1);
    expect(requestSignal).toBe(timeoutSignal);
  } finally {
    timeoutSpy.mockRestore();
  }
});

it("explains when the Budokon endpoint cannot be reached", async () => {
  const fetcher = vi.fn<typeof fetch>().mockRejectedValue(new TypeError("fetch failed"));
  const client = new BudokonClient(fetcher);
  await expect(client.drawBatch("offline", 2))
    .rejects.toThrow("Unable to connect to the Budokon API. Check your internet connection and try again.");
  expect(client.getDiagnostics()).toMatchObject({
    attempts: 1,
    failures: 1,
    lastOutcome: "network",
    failureCounts: { network: 1 }
  });
});

it("maps malformed JSON from a successful HTTP response to the invalid-response error", async () => {
  const client = new BudokonClient(vi.fn().mockResolvedValue(new Response("{ broken json", { status: 200 })));

  await expect(client.drawBatch("malformed-json", 2))
    .rejects.toThrow("Budokon API returned an invalid response. Try again later.");
});

it("classifies invalid response shapes separately from errors with the same public message", async () => {
  const invalidShape = new BudokonClient(
    vi.fn().mockResolvedValue(new Response(JSON.stringify({ judoka: [] }), { status: 200 })),
  );
  await expect(invalidShape.drawBatch("invalid-shape", 2)).rejects.toThrow(
    "Budokon API returned an invalid response. Try again later.",
  );
  expect(invalidShape.getDiagnostics()).toMatchObject({
    lastOutcome: "invalid-response",
    failureCounts: { "invalid-response": 1 },
  });

  const externalError = new Error("Budokon API returned an invalid response. Try again later.");
  const externalFailure = new BudokonClient(
    vi.fn<typeof fetch>().mockRejectedValue(externalError),
  );
  const thrownError = await externalFailure.drawBatch("external-error", 2).catch(error => error);
  expect(thrownError).toBe(externalError);
  expect(externalFailure.getDiagnostics()).toMatchObject({
    lastOutcome: "unknown",
    failureCounts: { unknown: 1 },
  });
});

it("allows a failed draw to be retried with the same deterministic request", async () => {
  const fetcher = vi.fn<typeof fetch>()
    .mockResolvedValueOnce(new Response("unavailable", { status: 503 }))
    .mockResolvedValueOnce(new Response(JSON.stringify({ judoka }), { status: 200 }));
  const client = new BudokonClient(fetcher);

  await expect(client.drawBatch("same-seed", 2)).rejects.toThrow("temporarily unavailable");
  await expect(client.drawBatch("same-seed", 2)).resolves.toEqual(judoka);

  expect(fetcher).toHaveBeenCalledTimes(2);
});

it("exposes request outcome and latency diagnostics without response data", async () => {
  const client = new BudokonClient(vi.fn().mockResolvedValue(new Response("{ malformed", { status: 200 })));

  await expect(client.drawBatch("diagnostics-seed", 2)).rejects.toThrow("invalid response");

  expect(client.getDiagnostics()).toMatchObject({
    attempts: 1,
    successes: 0,
    failures: 1,
    lastOutcome: "invalid-response",
    failureCounts: { "invalid-response": 1 },
    httpFailureStatusCounts: {}
  });
  expect(Object.keys(client.getDiagnostics())).not.toContain("body");
});
