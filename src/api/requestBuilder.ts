/**
 * Constructs HTTP requests to the Budokon API
 */
export class BudokonRequestBuilder {
  private readonly url = "https://budokon.scheimann.workers.dev/v1/draw";

  /**
   * Builds a fetch request for drawing judoka
   */
  buildRequest(
    seed: string,
    count: number,
    weightClass?: string,
    exclude?: string[]
  ): RequestInit {
    return {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        count,
        seed,
        ...(weightClass ? { filters: { weightClass } } : {}),
        ...(exclude?.length ? { exclude } : {})
      })
    };
  }

  /**
   * Gets the Budokon API endpoint URL
   */
  getUrl(): string {
    return this.url;
  }
}
