import { STAT_KEYS, type Judoka, type StatKey } from "../api/types";
import { isJudoka } from "../api/validation";
import type { Match, MatchResult, Outcome, Phase } from "./game";

export interface SavedHistoryItem { outcome: Outcome; stat: StatKey; roundNumber: number; }
export interface SavedMatch {
  version: 1;
  match: Match | null;
  result: MatchResult | null;
  history: SavedHistoryItem[];
  activeSeed: string;
  activeWeight?: string;
  drawBuffer: Judoka[];
}

const outcomes = new Set<Outcome>(["player", "opponent", "draw"]);
const phases = new Set<Phase>(["selecting", "awaitingNext", "matchOver"]);

/**
 * Validation schema for Match objects
 */
const matchSchema = {
  player: isJudoka,
  opponent: isJudoka,
  target: (v: unknown) => Number.isInteger(v),
  matchNumber: (v: unknown) => Number.isInteger(v),
  mode: (v: unknown) => v === "classic" || v === "champion",
  phase: (v: unknown) => typeof v === "string" && phases.has(v as Phase),
  winner: (v: unknown) => v === null || outcomes.has(v as Outcome),
  scores: (v: unknown) => {
    if (!v || typeof v !== "object") return false;
    const scores = v as Record<string, unknown>;
    return typeof scores.player === "number" && typeof scores.opponent === "number";
  }
};

/**
 * Validates a value against a schema object
 */
function validateSchema(value: unknown, schema: Record<string, (v: unknown) => boolean>): boolean {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Record<string, unknown>;
  return Object.entries(schema).every(([key, validator]) => validator(candidate[key]));
}

function isMatch(value: unknown): value is Match {
  return validateSchema(value, matchSchema);
}

function isMatchOrNull(value: unknown): value is Match | null {
  return value === null || isMatch(value);
}

/**
 * Validation schema for SavedHistoryItem
 */
const historyItemSchema = {
  outcome: (v: unknown) => outcomes.has(v as Outcome),
  stat: (v: unknown) => STAT_KEYS.includes(v as StatKey),
  roundNumber: (v: unknown) => Number.isInteger(v)
};

function isHistory(value: unknown): value is SavedHistoryItem[] {
  if (!Array.isArray(value)) return false;
  return value.every(item => validateSchema(item, historyItemSchema));
}

export function stringifySavedMatch(value: SavedMatch): string { return JSON.stringify(value); }

/**
 * Validation schema for SavedMatch
 */
const savedMatchSchema = {
  version: (v: unknown) => v === 1,
  match: isMatchOrNull,
  result: (v: unknown) => (v === null || (v && typeof v === "object")) as boolean,
  history: isHistory,
  activeSeed: (v: unknown) => typeof v === "string",
  activeWeight: (v: unknown) => (v === undefined || typeof v === "string") as boolean,
  drawBuffer: (v: unknown) => (Array.isArray(v) && v.every(isJudoka)) as boolean
};

export function parseSavedMatch(value: string | null): SavedMatch | null {
  if (!value) return null;
  try {
    const parsed: unknown = JSON.parse(value);
    if (!validateSchema(parsed, savedMatchSchema)) return null;
    return parsed as unknown as SavedMatch;
  } catch { return null; }
}
