import { describe, expect, it, vi } from "vitest";
import { BudokonClient } from "./budokon";

describe("BudokonClient", () => {
  const judoka = [
    { id: "a", slug: "a", firstname: "A", surname: "A", country: "Japan", countryCode: "JP", weightClass: "-60", stats: { power: 1, speed: 2, technique: 3, kumikata: 4, newaza: 5 } },
    { id: "b", slug: "b", firstname: "B", surname: "B", country: "France", countryCode: "FR", weightClass: "-66", stats: { power: 5, speed: 4, technique: 3, kumikata: 2, newaza: 1 } }
  ];

  // Request-shape compatibility follows the public API contract: https://budokon.scheimann.workers.dev/docs
  it("requests a pair with the count and replay seed required by the API contract", async () => {
    let requestBody: unknown;
    const fetcher = vi.fn((_url: string, init?: RequestInit) => {
      const body = init?.body;
      requestBody = typeof body === "string" ? JSON.parse(body) : undefined;
      return Promise.resolve(new Response(JSON.stringify({ judoka }), { status: 200 }));
    }) as unknown as typeof fetch;

    await new BudokonClient(fetcher).drawPair("known-seed");

    expect(requestBody).toEqual(expect.objectContaining({ count: 2, seed: "known-seed" }));
  });

  it("reuses an in-flight or completed deterministic draw instead of issuing another API call", async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify({ judoka }), { status: 200 }));
    const client = new BudokonClient(fetcher);

    await Promise.all([client.drawPair("known-seed"), client.drawPair("known-seed")]);
    await client.drawPair("known-seed");

    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  describe("rarity response validation", () => {
    // The API's Judoka response schema makes `rarity` optional: https://budokon.scheimann.workers.dev/docs
    it.each([
      { scenario: "valid string rarity", rarity: "Rare", outcome: "accepted" },
      { scenario: "omitted rarity", outcome: "accepted" },
      { scenario: "invalid non-string rarity", rarity: 1, outcome: "rejected" }
    ] as const)("$scenario", async ({ rarity, outcome }) => {
      const firstJudoka = rarity === undefined ? { ...judoka[0] } : { ...judoka[0], rarity };
      const responseJudoka = [firstJudoka, judoka[1]];
      const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify({ judoka: responseJudoka }), { status: 200 }));
      const request = new BudokonClient(fetcher).drawPair("known-seed");

      if (outcome === "rejected") {
        await expect(request).rejects.toThrow("invalid judoka draw");
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
    const pair = await new BudokonClient(fetcher).drawPair("known-seed", "-81");
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
    it("reports the Budokon status code for a non-success HTTP status", async () => {
      const client = new BudokonClient(vi.fn().mockResolvedValue(new Response("nope", { status: 503 })));
      await expect(client.drawPair("seed")).rejects.toThrow("Budokon draw failed (503)");
    });

    it("explains when a selected division has no compatible pair", async () => {
      const client = new BudokonClient(vi.fn().mockResolvedValue(new Response("nope", { status: 409 })));
      await expect(client.drawPair("seed", "-81")).rejects.toThrow("No compatible -81 kg pair is available");
    });

    it("reports a generic conflict for an unfiltered draw", async () => {
      const client = new BudokonClient(vi.fn().mockResolvedValue(new Response("nope", { status: 409 })));
      await expect(client.drawPair("seed")).rejects.toThrow("Budokon draw failed (409)");
    });
  });
  it("rejects a response that omits a battle stat", async () => {
    const incomplete = { id: "a", slug: "a", firstname: "A", surname: "A", country: "Japan", countryCode: "JP", weightClass: "-60", stats: { power: 1 } };
    const client = new BudokonClient(vi.fn().mockResolvedValue(new Response(JSON.stringify({ judoka: [incomplete, incomplete] }), { status: 200 })));
    await expect(client.drawPair("seed")).rejects.toThrow("invalid judoka draw");
  });
  it("times out an unresponsive draw request", async () => {
    vi.useFakeTimers();
    const fetcher = vi.fn((_url: string, options: RequestInit) => new Promise<Response>((_resolve, reject) => {
      options.signal?.addEventListener("abort", () => reject(new DOMException("Aborted", "AbortError")));
    })) as unknown as typeof fetch;
    const request = new BudokonClient(fetcher, 1).drawPair("seed");
    const expectation = expect(request).rejects.toThrow("Judoka draw timed out");
    await vi.advanceTimersByTimeAsync(1);
    await expectation;
    vi.useRealTimers();
  });
});
