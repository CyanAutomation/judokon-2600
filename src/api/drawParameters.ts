/** The normalized parameters that uniquely identify a Budokon draw. */
export interface DrawParameters {
  seed: string;
  count: number;
  weightClass?: string;
  exclude: string[];
}

/**
 * Produces the single representation used for both requests and cache keys.
 * Empty optional values are omitted and exclusions behave as a set.
 */
export function normalizeDrawParameters(
  seed: string,
  count: number,
  weightClass?: string,
  exclude?: string[]
): DrawParameters {
  return {
    seed,
    count,
    ...(weightClass ? { weightClass } : {}),
    exclude: [...new Set(exclude ?? [])].sort()
  };
}
