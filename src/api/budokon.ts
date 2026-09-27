import type { Judoka } from "./types";
import { BudokonCache, type BudokonCacheOptions } from "./cache";
import { BudokonRequestBuilder } from "./requestBuilder";
import { BudokonResponseValidator } from "./responseValidator";
import { normalizeDrawParameters, type DrawParameters } from "./drawParameters";

type Fetcher = typeof fetch;

export class BudokonClient {
  private readonly cache: BudokonCache;
  private readonly builder: BudokonRequestBuilder;
  private readonly validator: BudokonResponseValidator;

  constructor(
    private readonly fetcher: Fetcher = globalThis.fetch.bind(globalThis),
    private readonly timeoutMs = 10_000,
    cacheOptions: BudokonCacheOptions = {}
  ) {
    this.cache = new BudokonCache(cacheOptions);
    this.builder = new BudokonRequestBuilder();
    this.validator = new BudokonResponseValidator();
  }

  /**
   * Draws one opponent. `exclude` contains Budokon judoka IDs (not slugs) that
   * are forwarded to the remote API. The API guarantees those exclusions;
   * this client validates the response shape but does not re-check its ID.
   */
  async drawOpponent(seed: string, exclude: string[], weightClass?: string): Promise<Judoka> {
    return (await this.drawBatch(seed, 1, weightClass, exclude))[0]!;
  }

  /**
   * Draw a deterministic batch so a match can continue without a network round trip per round.
   * Budokon uses 409 when a draw cannot satisfy its constraints. For a weight-class draw,
   * expose that as the user-facing empty-division message.
   */
  async drawBatch(seed: string, count: number, weightClass?: string, exclude?: string[]): Promise<Judoka[]> {
    if (!Number.isSafeInteger(count) || count < 1) {
      throw new Error("draw count must be a positive integer");
    }
    const parameters = normalizeDrawParameters(seed, count, weightClass, exclude);
    const key = this.builder.getUrl() + "#" + this.cache.getCacheKey(parameters);
    return this.cache.getCached(key, () =>
      this.performDraw(parameters)
    );
  }

  /**
   * Check if an error is a timeout/abort error
   */
  private static isTimeoutError(error: unknown): boolean {
    return (
      (error instanceof Error && error.message === "Aborted") ||
      (typeof error === "object" && error !== null && (error as Record<string, unknown>).name === "AbortError")
    );
  }

  private async performDraw(parameters: DrawParameters): Promise<Judoka[]> {
    const { count, weightClass } = parameters;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const request = this.builder.buildRequest(parameters);
      const response = await this.fetcher(this.builder.getUrl(), {
        ...request,
        signal: controller.signal
      });

      if (!response.ok) {
        this.validator.handleHttpError(response.status, weightClass);
      }

      const body = await response.json();
      return this.validator.validateJudokaArray(body, count);
    } catch (error) {
      if (BudokonClient.isTimeoutError(error)) {
        throw new Error("Judoka draw timed out");
      }
      throw error;
    } finally {
      clearTimeout(timeout);
    }
  }
}
