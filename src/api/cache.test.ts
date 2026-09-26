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
  it("rejects a zero entry limit", () => {
    expect(() => new BudokonCache({ maxEntries: 0 })).toThrow(
      "cache maxEntries must be a positive integer"
    );
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
});
