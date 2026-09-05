import type { Judoka } from "./types";
import { isJudoka } from "./validation";

const DRAW_URL = "https://budokon.scheimann.workers.dev/v1/draw";
type Fetcher = typeof fetch;

export class BudokonClient {
  private readonly draws = new Map<string, Promise<Judoka[]>>();

  constructor(private readonly fetcher: Fetcher = globalThis.fetch.bind(globalThis), private readonly timeoutMs = 10_000) {}

  /**
   * Draws one opponent. `exclude` contains Budokon judoka IDs (not slugs) that
   * are forwarded to the remote API. The API guarantees those exclusions;
   * this client validates the response shape but does not re-check its ID.
   */
  async drawOpponent(seed: string, exclude: string[], weightClass?: string): Promise<Judoka> {
    return (await this.draw(seed, 1, weightClass, exclude))[0]!;
  }

  /** Draw a deterministic batch so a match can continue without a network round trip per round. */
  async drawBatch(seed: string, count: number, weightClass?: string, exclude?: string[]): Promise<Judoka[]> {
    if (!Number.isSafeInteger(count) || count < 1) throw new Error("draw count must be a positive integer");
    return this.draw(seed, count, weightClass, exclude);
  }

  /**
   * Budokon uses 409 when a draw cannot satisfy its constraints. For a
   * weight-class draw, expose that as the user-facing empty-division message;
   * an unfiltered conflict remains a generic HTTP failure.
   */
  private async draw(seed: string, count: number, weightClass?: string, exclude?: string[]): Promise<Judoka[]> {
    const key = JSON.stringify({ seed, count, weightClass, exclude: exclude ? [...exclude].sort() : [] });
    const cached = this.draws.get(key);
    if (cached) return cached;
    const request = this.requestDraw(seed, count, weightClass, exclude);
    this.draws.set(key, request);
    try {
      return await request;
    } catch (error) {
      this.draws.delete(key);
      throw error;
    }
  }

  private async requestDraw(seed: string, count: number, weightClass?: string, exclude?: string[]): Promise<Judoka[]> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);
    let response: Response;
    try {
      response = await this.fetcher(DRAW_URL, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ count, seed, ...(weightClass ? { filters: { weightClass } } : {}), ...(exclude?.length ? { exclude } : {}) }),
        signal: controller.signal
      });
    } catch (error) {
      if (controller.signal.aborted) throw new Error("Judoka draw timed out");
      throw error;
    } finally {
      clearTimeout(timeout);
    }
    if (!response.ok) {
      if (response.status === 409 && weightClass) throw new Error(`No compatible ${weightClass} kg pair is available in the current Budokon dataset`);
      throw new Error(`Budokon draw failed (${response.status})`);
    }
    const body: unknown = await response.json();
    const drawn = typeof body === "object" && body !== null ? (body as { judoka?: unknown }).judoka : undefined;
    if (!Array.isArray(drawn) || drawn.length !== count || !drawn.every(isJudoka)) throw new Error("Budokon returned an invalid judoka draw");
    return drawn;
  }
}
