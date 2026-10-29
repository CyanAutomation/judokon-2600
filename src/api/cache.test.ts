import { describe, expect, it, vi } from "vitest";
import { BudokonCache } from "./cache";
import type { Judoka } from "./types";

const result = (id: string): Judoka[] => [{
  id,
  slug: id,
  firstname: id,
  surname: id,
  country: "Japan",
  countryCode: "JP",
  weightClass: "-60",
  stats: { power: 1, speed: 2, technique: 3, kumikata: 4, newaza: 5 }
}];

describe("BudokonCache", () => {
  it.each([0, -1, 1.5, Number.NaN, Number.POSITIVE_INFINITY, Number.MAX_SAFE_INTEGER + 1])(
    "rejects invalid entry limit %s",
    maxEntries => {
      expect(() => new BudokonCache({ maxEntries })).toThrow(
        "cache maxEntries must be a positive integer"
      );
    }
  );

  it("accepts a positive safe integer entry limit", () => {
    expect(() => new BudokonCache({ maxEntries: 1 })).not.toThrow();
  });

  it("reports requests, hits, coalesced calls, and upstream fetches", async () => {
    const cache = new BudokonCache();
    const fetcher = vi.fn().mockResolvedValue(result("a"));

    await cache.getCached("key", fetcher);
    await cache.getCached("key", fetcher);

    expect(cache.getStats()).toEqual({ requests: 2, hits: 1, coalesced: 0, misses: 1, evictions: 0, expirations: 0 });
  });

  it("counts request coalescing, expiry, and eviction", async () => {
    let now = 0;
    const cache = new BudokonCache({ maxEntries: 1, expirationMs: 10, clock: () => now });
    let resolveRequest!: (value: Judoka[]) => void;
    const pending = new Promise<Judoka[]>(resolve => { resolveRequest = resolve; });
    const first = cache.getCached("a", () => pending);
    const joined = cache.getCached("a", () => pending);
    resolveRequest(result("a"));
    await Promise.all([first, joined]);
    await cache.getCached("b", () => Promise.resolve(result("b")));
    now = 10;
    await cache.getCached("b", () => Promise.resolve(result("b")));

    expect(cache.getStats()).toEqual({ requests: 4, hits: 1, coalesced: 1, misses: 3, evictions: 1, expirations: 1 });
  });

  it("expires a completed entry after the configured lifetime", async () => {
    let now = 100;
    const cache = new BudokonCache({ expirationMs: 10, clock: () => now });
    const fetcher = vi.fn().mockResolvedValue(result("a"));

    await cache.getCached("key", fetcher);
    now = 109;
    await cache.getCached("key", fetcher);
    now = 110;
    await cache.getCached("key", fetcher);

    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it("evicts the least-recently-used completed entry when full", async () => {
    let now = 0;
    const cache = new BudokonCache({ maxEntries: 2, clock: () => now });
    const fetcher = vi.fn((key: string) => Promise.resolve(result(key)));

    await cache.getCached("a", () => fetcher("a"));
    now = 1;
    await cache.getCached("b", () => fetcher("b"));
    now = 2;
    await cache.getCached("a", () => fetcher("a"));
    now = 3;
    await cache.getCached("c", () => fetcher("c"));
    await cache.getCached("a", () => fetcher("a"));
    await cache.getCached("b", () => fetcher("b"));

    expect(fetcher.mock.calls.map(([key]) => key)).toEqual(["a", "b", "c", "b"]);
  });

  it("removes a failed request so the next caller can retry", async () => {
    const cache = new BudokonCache();
    const fetcher = vi.fn()
      .mockRejectedValueOnce(new Error("network failure"))
      .mockResolvedValueOnce(result("retry"));

    await expect(cache.getCached("key", fetcher)).rejects.toThrow("network failure");
    await expect(cache.getCached("key", fetcher)).resolves.toEqual(result("retry"));
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it("shares one in-flight request between concurrent callers", async () => {
    let resolveRequest!: (value: Judoka[]) => void;
    const request = new Promise<Judoka[]>(resolve => { resolveRequest = resolve; });
    const fetcher = vi.fn(() => request);
    const cache = new BudokonCache();

    const first = cache.getCached("key", fetcher);
    const second = cache.getCached("key", fetcher);
    resolveRequest(result("shared"));

    await expect(Promise.all([first, second])).resolves.toEqual([result("shared"), result("shared")]);
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it("isolates cached judoka and nested stats from caller mutations", async () => {
    const cache = new BudokonCache();
    const original = result("original");
    const fetcher = vi.fn().mockResolvedValue(original);

    const first = await cache.getCached("key", fetcher);
    first[0]!.firstname = "Mutated";
    first[0]!.stats.power = 99;

    const second = await cache.getCached("key", fetcher);

    expect(second).toEqual(result("original"));
    expect(second[0]).not.toBe(first[0]);
    expect(second[0]!.stats).not.toBe(first[0]!.stats);
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
});
