import { describe, expect, it } from "vitest";
import { BudokonClient } from "../../api/budokon";
import { SIMULATED_JUDOKA } from "./fixtures";
import { createBudokonSimulatorFetch, SIMULATOR_ALGORITHM, SIMULATOR_DATASET_VERSION } from "./simulator";

const url = "https://budokon.scheimann.workers.dev/v1/draw";
const request = (body: unknown, signal?: AbortSignal): RequestInit => ({
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify(body),
  ...(signal ? { signal } : {})
});

async function draw(fetcher: typeof fetch, body: unknown): Promise<Response> {
  return fetcher(url, request(body));
}

describe("Budokon draw simulator", () => {
  it("returns the requested number of valid judoka with explicit synthetic identifiers", async () => {
    const response = await draw(createBudokonSimulatorFetch(), { count: 6, seed: "quick-start" });
    const result = await response.json() as { datasetVersion: string; algorithm: string; judoka: unknown[] };

    expect(response.status).toBe(200);
    expect(result).toMatchObject({
      datasetVersion: SIMULATOR_DATASET_VERSION,
      algorithm: SIMULATOR_ALGORITHM
    });
    expect(result.judoka).toHaveLength(6);
    expect(result.judoka.every(item => SIMULATED_JUDOKA.some(fixture => fixture.id === (item as { id: string }).id))).toBe(true);
    expect(new Set(SIMULATED_JUDOKA.map(judoka => judoka.id)).size).toBe(SIMULATED_JUDOKA.length);
    expect(new Set(SIMULATED_JUDOKA.map(judoka => judoka.slug)).size).toBe(SIMULATED_JUDOKA.length);
    expect(SIMULATED_JUDOKA.every(judoka => Object.values(judoka.stats).every(value => Number.isInteger(value) && value >= 0 && value <= 10))).toBe(true);
    expect(new Set(SIMULATED_JUDOKA.map(judoka => judoka.weightClass)).size).toBe(14);
  });

  it("returns equivalent ordered results for identical requests", async () => {
    const fetcher = createBudokonSimulatorFetch();
    const first = await (await draw(fetcher, { count: 5, seed: "repeatable" })).json();
    const second = await (await draw(fetcher, { count: 5, seed: "repeatable" })).json();
    expect(second).toEqual(first);
  });

  it("varies a seeded draw while keeping each result valid", async () => {
    const fetcher = createBudokonSimulatorFetch();
    const first = await (await draw(fetcher, { count: 3, seed: "seed-alpha" })).json() as { judoka: { id: string }[] };
    const second = await (await draw(fetcher, { count: 3, seed: "seed-beta" })).json() as { judoka: { id: string }[] };

    expect(first.judoka.map(judoka => judoka.id)).not.toEqual(second.judoka.map(judoka => judoka.id));
    expect(first.judoka.every(judoka => SIMULATED_JUDOKA.some(fixture => fixture.id === judoka.id))).toBe(true);
    expect(second.judoka.every(judoka => SIMULATED_JUDOKA.some(fixture => fixture.id === judoka.id))).toBe(true);
  });

  it("returns unique entries and respects weight classes and exclusions", async () => {
    const fetcher = createBudokonSimulatorFetch();
    const weighted = await (await draw(fetcher, { count: 6, seed: "weight", filters: { weightClass: "-81" } })).json() as { judoka: { id: string; weightClass: string }[] };
    expect(weighted.judoka).toHaveLength(6);
    expect(weighted.judoka.every(judoka => judoka.weightClass === "-81")).toBe(true);
    expect(new Set(weighted.judoka.map(judoka => judoka.id)).size).toBe(6);

    const excludedId = weighted.judoka[0]!.id;
    const excluded = await (await draw(fetcher, { count: 5, seed: "weight", filters: { weightClass: "-81" }, exclude: [excludedId] })).json() as { judoka: { id: string }[] };
    expect(excluded.judoka.some(judoka => judoka.id === excludedId)).toBe(false);
  });

  it("returns HTTP 409 when too few fixtures satisfy the request", async () => {
    const response = await draw(createBudokonSimulatorFetch(), { count: 7, seed: "too-many", filters: { weightClass: "+100" } });
    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toMatchObject({ error: { code: "insufficient_pool" } });
  });

  it("does not let callers mutate fixtures used by later responses", async () => {
    const fetcher = createBudokonSimulatorFetch();
    const first = await (await draw(fetcher, { count: 1, seed: "immutable" })).json() as { judoka: { id: string; stats: { power: number } }[] };
    const fixture = SIMULATED_JUDOKA.find(judoka => judoka.id === first.judoka[0]!.id)!;
    first.judoka[0]!.id = "corrupted";
    first.judoka[0]!.stats.power = -1;

    const second = await (await draw(fetcher, { count: 1, seed: "immutable" })).json() as { judoka: { id: string; stats: { power: number } }[] };
    expect(second.judoka[0]).toEqual(fixture);
  });

  it("is accepted through the existing client, request builder, and response validator", async () => {
    const client = new BudokonClient(createBudokonSimulatorFetch());
    const result = await client.drawBatch("client-compatibility", 6, "-73");
    expect(result).toHaveLength(6);
    expect(result.every(judoka => judoka.weightClass === "-73")).toBe(true);
  });

  it("rejects an already aborted simulated request", async () => {
    const controller = new AbortController();
    controller.abort();
    await expect(createBudokonSimulatorFetch()(url, request({ count: 1, seed: "aborted" }, controller.signal)))
      .rejects.toMatchObject({ name: "AbortError" });
  });

  it("reports unsupported paths and methods with HTTP responses", async () => {
    const fetcher = createBudokonSimulatorFetch();
    const unsupportedPath = await fetcher("https://example.test/v1/judoka", { method: "GET" });
    const unsupportedMethod = await fetcher(url, { method: "GET" });
    expect(unsupportedPath.status).toBe(404);
    expect(unsupportedMethod.status).toBe(405);
  });
});
