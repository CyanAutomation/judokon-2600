import type { Judoka } from "../../api/types";
import { SIMULATED_JUDOKA } from "./fixtures";

export const SIMULATOR_DATASET_VERSION = "ju-do-kon-sim-fixtures-v1";
export const SIMULATOR_ALGORITHM = "ju-do-kon-simulator-v1";

interface DrawRequestBody {
  count?: number;
  seed?: string;
  filters?: { weightClass?: string | string[] };
  exclude?: string[];
}

function jsonResponse(status: number, body?: unknown): Response {
  return new Response(body === undefined ? null : JSON.stringify(body), {
    status,
    headers: body === undefined ? undefined : { "content-type": "application/json; charset=utf-8" }
  });
}

function errorResponse(status: number, code: string, message: string): Response {
  return jsonResponse(status, { error: { code, message } });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseDrawRequest(value: unknown): DrawRequestBody | undefined {
  if (!isRecord(value)) return undefined;
  const { count, seed, filters, exclude } = value;
  if (count !== undefined && (!Number.isSafeInteger(count) || (count as number) < 1)) return undefined;
  if (seed !== undefined && typeof seed !== "string") return undefined;
  if (exclude !== undefined && (!Array.isArray(exclude) || !exclude.every(item => typeof item === "string"))) return undefined;

  let weightClass: string | string[] | undefined;
  if (filters !== undefined) {
    if (!isRecord(filters)) return undefined;
    const filterValue = filters.weightClass;
    if (filterValue !== undefined) {
      if (typeof filterValue === "string") weightClass = filterValue;
      else if (Array.isArray(filterValue) && filterValue.length > 0 && filterValue.every(item => typeof item === "string")) {
        weightClass = filterValue as string[];
      } else return undefined;
    }
  }

  return {
    ...(count === undefined ? {} : { count: count as number }),
    ...(seed === undefined ? {} : { seed: seed as string }),
    ...(weightClass === undefined ? {} : { filters: { weightClass } }),
    ...(exclude === undefined ? {} : { exclude: exclude as string[] })
  };
}

/** A small rolling hash ranks fixtures; it is intentionally unrelated to budokon-v1. */
function orderKey(seed: string, id: string): number {
  const input = `${seed}:${id}`;
  let hash = 0;
  for (let index = 0; index < input.length; index += 1) {
    hash = (Math.imul(hash, 31) + input.charCodeAt(index)) >>> 0;
  }
  return hash;
}

function cloneJudoka(judoka: Judoka): Judoka {
  return { ...judoka, stats: { ...judoka.stats } };
}

function selectDraw(pool: readonly Judoka[], count: number, seed: string): Judoka[] {
  return pool
    .map(judoka => ({ judoka, key: orderKey(seed, judoka.id) }))
    .sort((left, right) => left.key - right.key || (left.judoka.id < right.judoka.id ? -1 : left.judoka.id > right.judoka.id ? 1 : 0))
    .slice(0, count)
    .map(({ judoka }) => cloneJudoka(judoka));
}

function requestUrl(input: RequestInfo | URL): string {
  if (typeof input === "string") return input;
  return input instanceof URL ? input.href : input.url;
}

function abortError(): DOMException {
  return new DOMException("The simulated draw was aborted.", "AbortError");
}

/** Fetch-compatible local implementation of the public POST /v1/draw subset. */
export function createBudokonSimulatorFetch(fixtures: readonly Judoka[] = SIMULATED_JUDOKA): typeof fetch {
  return async (input, init = {}) => {
    const request = input instanceof Request ? input : undefined;
    const signal = init.signal ?? request?.signal;
    if (signal?.aborted) throw abortError();

    let url: URL;
    try {
      url = new URL(requestUrl(input));
    } catch {
      return errorResponse(400, "invalid_url", "A valid request URL is required.");
    }
    if (url.pathname !== "/v1/draw") return errorResponse(404, "not_found", "Only POST /v1/draw is supported by the simulator.");

    const method = (init.method ?? request?.method ?? "GET").toUpperCase();
    if (method === "OPTIONS") return jsonResponse(204);
    if (method !== "POST") return errorResponse(405, "method_not_allowed", "Use POST for /v1/draw.");

    const headers = new Headers(init.headers ?? request?.headers);
    if (!headers.get("content-type")?.toLowerCase().startsWith("application/json")) {
      return errorResponse(415, "unsupported_media_type", "Content-Type must be application/json.");
    }

    let bodyText: string;
    if (typeof init.body === "string") bodyText = init.body;
    else if (init.body === undefined && request) bodyText = await request.clone().text();
    else return errorResponse(400, "invalid_body", "A JSON draw request is required.");

    if (signal?.aborted) throw abortError();

    let parsed: unknown;
    try {
      parsed = JSON.parse(bodyText) as unknown;
    } catch {
      return errorResponse(400, "invalid_json", "The draw request must contain valid JSON.");
    }

    const drawRequest = parseDrawRequest(parsed);
    if (!drawRequest) return errorResponse(400, "invalid_request", "The draw request has invalid parameters.");

    const requestedCount = drawRequest.count ?? 1;
    const requestedWeightClasses = drawRequest.filters?.weightClass;
    const weightClasses = requestedWeightClasses === undefined
      ? undefined
      : new Set(Array.isArray(requestedWeightClasses) ? requestedWeightClasses : [requestedWeightClasses]);
    const excluded = new Set(drawRequest.exclude ?? []);
    const eligible = fixtures.filter(judoka =>
      (!weightClasses || weightClasses.has(judoka.weightClass)) &&
      !excluded.has(judoka.id) &&
      !excluded.has(judoka.slug)
    );

    if (signal?.aborted) throw abortError();
    if (requestedCount > eligible.length) {
      return errorResponse(409, "insufficient_pool", `Requested ${requestedCount} judoka, but only ${eligible.length} eligible synthetic fixtures are available.`);
    }

    const seed = drawRequest.seed ?? "";
    return jsonResponse(200, {
      datasetVersion: SIMULATOR_DATASET_VERSION,
      algorithm: SIMULATOR_ALGORITHM,
      ...(drawRequest.seed === undefined ? {} : { seed }),
      poolSize: eligible.length,
      judoka: selectDraw(eligible, requestedCount, seed)
    });
  };
}
