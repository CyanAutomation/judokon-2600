import type { Judoka, StatKey } from "./types";
import { STAT_KEYS } from "./types";

/**
 * Type guard to validate that a value conforms to the Judoka interface.
 * Checks all required string fields, optional rarity field, and stats object.
 */
export function isJudoka(value: unknown): value is Judoka {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as Record<string, unknown>;
  if (!["id", "slug", "firstname", "surname", "country", "countryCode", "weightClass"].every((key) => typeof candidate[key] === "string")) return false;
  if (candidate.rarity !== undefined && typeof candidate.rarity !== "string") return false;
  if (typeof candidate.stats !== "object" || candidate.stats === null) return false;
  const stats = candidate.stats as Record<string, unknown>;
  return STAT_KEYS.every((key) => typeof stats[key] === "number" && Number.isFinite(stats[key])) && Object.keys(stats).every((key) => isStatKey(key));
}

/**
 * Type guard to validate that a string value is a valid StatKey.
 */
function isStatKey(value: string): value is StatKey {
  return (STAT_KEYS as readonly string[]).includes(value);
}
