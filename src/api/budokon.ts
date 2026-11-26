import type { Judoka } from "./types";
import { BudokonCache, type BudokonCacheOptions, type BudokonCacheStats } from "./cache";
import { BudokonRequestBuilder } from "./requestBuilder";
import { BudokonResponseValidator, InvalidBudokonResponseError } from "./responseValidator";
import { normalizeDrawParameters, type DrawParameters } from "./drawParameters";
import { RequestDiagnostics, type RequestDiagnosticsSnapshot, type RequestFailureCategory } from "./requestDiagnostics";

type Fetcher = typeof fetch;

export class BudokonClient {
  private readonly cache: BudokonCache;
  private readonly builder: BudokonRequestBuilder;
  private readonly validator: BudokonResponseValidator;
  private readonly diagnostics = new RequestDiagnostics();

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

  getCacheStats(): BudokonCacheStats {
    return this.cache.getStats();
  }

  getDiagnostics(): RequestDiagnosticsSnapshot {
    return this.diagnostics.snapshot();
  }

  /**
   * Check if an error is a timeout/abort error
   */
  private static isTimeoutError(error: unknown): boolean {
    return (
      (error instanceof Error && error.message === "Aborted") ||
      (typeof error === "object" && error !== null && ["AbortError", "TimeoutError"].includes(String((error as Record<string, unknown>).name)))
    );
  }

  private static isInvalidResponseError(error: unknown): boolean {
    return error instanceof SyntaxError || error instanceof InvalidBudokonResponseError;
  }

  private static failureCategory(error: unknown, status?: number): RequestFailureCategory {
    if (BudokonClient.isTimeoutError(error)) return "timeout";
    if (error instanceof TypeError) return "network";
    if (BudokonClient.isInvalidResponseError(error)) return "invalid-response";
    if (status !== undefined && status >= 300) return "http";
    return "unknown";
  }

  private async performDraw(parameters: DrawParameters): Promise<Judoka[]> {
    const { count, weightClass } = parameters;
    const signal = AbortSignal.timeout(this.timeoutMs);
    const startedAt = this.diagnostics.start();
    let responseStatus: number | undefined;

    try {
      const request = this.builder.buildRequest(parameters);
      const response = await this.fetcher(this.builder.getUrl(), {
        ...request,
        signal
      });

      responseStatus = response.status;
      if (!response.ok) {
        this.validator.handleHttpError(response.status, weightClass);
      }

      const body = await response.json();
      const result = this.validator.validateJudokaArray(body, count);
      this.diagnostics.recordSuccess(startedAt);
      return result;
    } catch (error) {
      const category = BudokonClient.failureCategory(error, responseStatus);
      this.diagnostics.recordFailure(startedAt, category, category === "http" ? responseStatus : undefined);
      if (BudokonClient.isTimeoutError(error)) {
        throw new Error("Budokon API request timed out. Check your connection and try again.");
      }
      if (error instanceof TypeError) {
        throw new Error("Unable to connect to the Budokon API. Check your internet connection and try again.");
      }
      if (BudokonClient.isInvalidResponseError(error)) {
        throw new Error("Budokon API returned an invalid response. Try again later.");
      }
      throw error;
    }
  }
}
