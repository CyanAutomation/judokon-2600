import type { Judoka, StatKey } from "./types";
import { STAT_KEYS } from "./types";

const DRAW_URL = "https://budokon.scheimann.workers.dev/v1/draw";
type Fetcher = typeof fetch;

function isStatKey(value: string): value is StatKey {
  return (STAT_KEYS as readonly string[]).includes(value);
}

function isJudoka(value: unknown): value is Judoka {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as Record<string, unknown>;
  if (!["id", "slug", "firstname", "surname", "country", "countryCode", "weightClass"].every((key) => typeof candidate[key] === "string")) return false;
  if (candidate.rarity !== undefined && typeof candidate.rarity !== "string") return false;
  if (typeof candidate.stats !== "object" || candidate.stats === null) return false;
  const stats = candidate.stats as Record<string, unknown>;
  return STAT_KEYS.every((key) => typeof stats[key] === "number" && Number.isFinite(stats[key])) && Object.keys(stats).every(isStatKey);
}

export class BudokonClient {
  constructor(private readonly fetcher: Fetcher = globalThis.fetch.bind(globalThis), private readonly timeoutMs = 10_000) {}

  async drawPair(seed: string, weightClass?: string): Promise<[Judoka, Judoka]> {
    const drawn = await this.draw(seed, 2, weightClass);
    return [drawn[0]!, drawn[1]!];
  }

  /**
   * Draws one opponent. `exclude` contains Budokon judoka IDs (not slugs) that
   * are forwarded to the remote API. The API guarantees those exclusions;
   * this client validates the response shape but does not re-check its ID.
   */
  async drawOpponent(seed: string, exclude: string[], weightClass?: string): Promise<Judoka> {
    return (await this.draw(seed, 1, weightClass, exclude))[0]!;
  }

  private async draw(seed: string, count: 1 | 2, weightClass?: string, exclude?: string[]): Promise<Judoka[]> {
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
