import { describe, expect, it, vi } from "vitest";
import { BudokonClient } from "./budokon";

describe("BudokonClient", () => {
  it("posts count and seed then returns a validated pair", async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify({ judoka: [
      { id: "a", slug: "a", firstname: "A", surname: "A", country: "Japan", countryCode: "JP", weightClass: "-60", stats: { power: 1, speed: 2, technique: 3, kumikata: 4, newaza: 5 } },
      { id: "b", slug: "b", firstname: "B", surname: "B", country: "France", countryCode: "FR", weightClass: "-66", stats: { power: 5, speed: 4, technique: 3, kumikata: 2, newaza: 1 } }
    ] }), { status: 200 }));
    const pair = await new BudokonClient(fetcher).drawPair("known-seed");
    expect(pair.map((judoka) => judoka.id)).toEqual(["a", "b"]);
    expect(fetcher).toHaveBeenCalledWith("https://budokon.scheimann.workers.dev/v1/draw", expect.objectContaining({ method: "POST", body: JSON.stringify({ count: 2, seed: "known-seed" }) }));
  });
  it("reports an unusable service response", async () => {
    const client = new BudokonClient(vi.fn().mockResolvedValue(new Response("nope", { status: 503 })));
    await expect(client.drawPair("seed")).rejects.toThrow("Budokon draw failed (503)");
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
