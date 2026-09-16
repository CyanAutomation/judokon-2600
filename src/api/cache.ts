import type { Judoka } from "./types";

/**
 * Manages memoization of judoka draw results
 */
export class BudokonCache {
  private readonly draws = new Map<string, Promise<Judoka[]>>();

  async getCached(
    key: string,
    fetcher: () => Promise<Judoka[]>
  ): Promise<Judoka[]> {
    const cached = this.draws.get(key);
    if (cached) return [...await cached];

    const request = fetcher();
    this.draws.set(key as string, request);
    try {
      return [...await request];
    } catch (error) {
      this.draws.delete(key);
      throw error;
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
