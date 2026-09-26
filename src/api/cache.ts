import type { Judoka } from "./types";

export interface BudokonCacheOptions {
  /** Maximum number of entries retained. In-flight entries are never evicted. */
  maxEntries?: number;
  /** Time for which a completed entry remains reusable, measured from creation. */
  expirationMs?: number;
  /** Supplies the current time in milliseconds. */
  clock?: () => number;
}

interface CacheEntry {
  request: Promise<Judoka[]>;
  createdAt: number;
  lastAccessedAt: number;
  completed: boolean;
}

export const DEFAULT_CACHE_MAX_ENTRIES = 100;
export const DEFAULT_CACHE_EXPIRATION_MS = 5 * 60 * 1_000;

/**
 * Manages memoization of judoka draw results.
 */
export class BudokonCache {
  private readonly draws = new Map<string, CacheEntry>();
  private readonly maxEntries: number;
  private readonly expirationMs: number;
  private readonly clock: () => number;

  constructor(options: BudokonCacheOptions = {}) {
    this.maxEntries = options.maxEntries ?? DEFAULT_CACHE_MAX_ENTRIES;
    this.expirationMs = options.expirationMs ?? DEFAULT_CACHE_EXPIRATION_MS;
    this.clock = options.clock ?? Date.now;

    if (!Number.isSafeInteger(this.maxEntries) || this.maxEntries < 1) {
      throw new Error("cache maxEntries must be a positive integer");
    }
    if (!Number.isFinite(this.expirationMs) || this.expirationMs < 0) {
      throw new Error("cache expirationMs must be a non-negative number");
    }
  }

  async getCached(
    key: string,
    fetcher: () => Promise<Judoka[]>
  ): Promise<Judoka[]> {
    const now = this.clock();
    const cached = this.draws.get(key);
    if (cached && (!cached.completed || !this.isExpired(cached, now))) {
      cached.lastAccessedAt = now;
      return [...await cached.request];
    }
    if (cached) this.draws.delete(key);

    const request = fetcher();
    const entry: CacheEntry = {
      request,
      createdAt: now,
      lastAccessedAt: now,
      completed: false
    };
    this.draws.set(key, entry);
    this.enforceLimit();

    try {
      const result = await request;
      entry.completed = true;
      this.removeExpired(this.clock());
      this.enforceLimit();
      return [...result];
    } catch (error) {
      // Only remove this request: a future implementation may replace the key
      // while an older request is settling.
      if (this.draws.get(key) === entry) this.draws.delete(key);
      throw error;
    }
  }

  private isExpired(entry: CacheEntry, now: number): boolean {
    return now - entry.createdAt >= this.expirationMs;
  }

  private removeExpired(now: number): void {
    for (const [key, entry] of this.draws) {
      if (entry.completed && this.isExpired(entry, now)) this.draws.delete(key);
    }
  }

  private enforceLimit(): void {
    while (this.draws.size > this.maxEntries) {
      let leastRecentlyUsed: { key: string; accessedAt: number } | undefined;

      for (const [key, entry] of this.draws) {
        if (!entry.completed) continue;
        if (!leastRecentlyUsed || entry.lastAccessedAt < leastRecentlyUsed.accessedAt) {
          leastRecentlyUsed = { key, accessedAt: entry.lastAccessedAt };
        }
      }

      // The limit is temporarily soft when every candidate is in flight.
      if (!leastRecentlyUsed) return;
      this.draws.delete(leastRecentlyUsed.key);
    }
  }

  /**
   * Generates a cache key from draw parameters
   */
  getCacheKey(
    seed: string,
    count: number,
    weightClass?: string,
    exclude?: string[]
  ): string {
    return JSON.stringify({
      seed,
      count,
      weightClass,
      exclude: exclude ? [...exclude].sort() : []
    });
  }
}
