import { describe, expect, it, vi } from "vitest";
import { BudokonClient } from "./budokon";

describe("BudokonClient", () => {
  it("posts count and seed then returns a validated pair", async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify({ judoka: [
      { id: "a", slug: "a", firstname: "A", surname: "A", country: "Japan", countryCode: "JP", weightClass: "-60", rarity: "Rare", stats: { power: 1, speed: 2, technique: 3, kumikata: 4, newaza: 5 } },
      { id: "b", slug: "b", firstname: "B", surname: "B", country: "France", countryCode: "FR", weightClass: "-66", stats: { power: 5, speed: 4, technique: 3, kumikata: 2, newaza: 1 } }
    ] }), { status: 200 }));
    const pair = await new BudokonClient(fetcher).drawPair("known-seed");
    expect(pair.map((judoka) => judoka.id)).toEqual(["a", "b"]);
    expect(pair[0]?.rarity).toBe("Rare");
    expect(fetcher).toHaveBeenCalledWith("https://budokon.scheimann.workers.dev/v1/draw", expect.objectContaining({ method: "POST", body: JSON.stringify({ count: 2, seed: "known-seed" }) }));
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
    const drawn = { id: "c", slug: "c", firstname: "C", surname: "C", country: "Japan", countryCode: "JP", weightClass: "-60", stats: { power: 1, speed: 2, technique: 3, kumikata: 4, newaza: 5 } };
    const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify({ judoka: [drawn] }), { status: 200 }));
    await expect(new BudokonClient(fetcher).drawOpponent("round-2", ["champion", "last-opponent"])).resolves.toMatchObject({ id: "c" });
    expect(fetcher).toHaveBeenCalledWith("https://budokon.scheimann.workers.dev/v1/draw", expect.objectContaining({
      body: JSON.stringify({ count: 1, seed: "round-2", exclude: ["champion", "last-opponent"] })
    }));
  });
  it("reports an unusable service response", async () => {
    const client = new BudokonClient(vi.fn().mockResolvedValue(new Response("nope", { status: 503 })));
    await expect(client.drawPair("seed")).rejects.toThrow("Budokon draw failed (503)");
  });
  it("explains when a selected division has no compatible pair", async () => {
    const client = new BudokonClient(vi.fn().mockResolvedValue(new Response("nope", { status: 409 })));
    await expect(client.drawPair("seed", "-81")).rejects.toThrow("No compatible -81 kg pair is available");
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
