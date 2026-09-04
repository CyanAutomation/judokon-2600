import { STAT_KEYS, type Judoka, type StatKey } from "../api/types";
import type { Match, MatchResult, Outcome, Phase } from "./game";

export interface SavedHistoryItem { outcome: Outcome; stat: StatKey; roundNumber: number; }
export interface SavedMatch {
  version: 1;
  match: Match;
  result: MatchResult | null;
  history: SavedHistoryItem[];
  activeSeed: string;
  activeWeight?: string;
  drawBuffer: Judoka[];
}

const outcomes = new Set<Outcome>(["player", "opponent", "draw"]);
const phases = new Set<Phase>(["selecting", "awaitingNext", "matchOver"]);

function isJudoka(value: unknown): value is Judoka {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Record<string, unknown>;
  if (!["id", "slug", "firstname", "surname", "country", "countryCode", "weightClass"].every(key => typeof candidate[key] === "string")) return false;
  if (candidate.rarity !== undefined && typeof candidate.rarity !== "string") return false;
  if (!candidate.stats || typeof candidate.stats !== "object") return false;
  const stats = candidate.stats as Record<string, unknown>;
  return STAT_KEYS.every(key => typeof stats[key] === "number" && Number.isFinite(stats[key]));
}

function isMatch(value: unknown): value is Match {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Record<string, unknown>;
  return isJudoka(candidate.player) && isJudoka(candidate.opponent)
    && Number.isInteger(candidate.target) && Number.isInteger(candidate.matchNumber)
    && !!candidate.scores && typeof candidate.scores === "object"
    && typeof (candidate.scores as Record<string, unknown>).player === "number"
    && typeof (candidate.scores as Record<string, unknown>).opponent === "number"
    && (candidate.mode === "classic" || candidate.mode === "champion")
    && typeof candidate.phase === "string" && phases.has(candidate.phase as Phase)
    && (candidate.winner === null || outcomes.has(candidate.winner as Outcome));
}

function isHistory(value: unknown): value is SavedHistoryItem[] {
  return Array.isArray(value) && value.every(item => !!item && typeof item === "object"
    && outcomes.has((item as Record<string, unknown>).outcome as Outcome)
    && STAT_KEYS.includes((item as Record<string, unknown>).stat as StatKey)
    && Number.isInteger((item as Record<string, unknown>).roundNumber));
}

export function stringifySavedMatch(value: SavedMatch): string { return JSON.stringify(value); }

export function parseSavedMatch(value: string | null): SavedMatch | null {
  if (!value) return null;
  try {
    const parsed: unknown = JSON.parse(value);
    if (!parsed || typeof parsed !== "object") return null;
    const candidate = parsed as Record<string, unknown>;
    if (candidate.version !== 1 || !isMatch(candidate.match) || !isHistory(candidate.history)
      || typeof candidate.activeSeed !== "string" || (candidate.activeWeight !== undefined && typeof candidate.activeWeight !== "string")
      || !Array.isArray(candidate.drawBuffer) || !candidate.drawBuffer.every(isJudoka)) return null;
    if (candidate.result !== null && (!candidate.result || typeof candidate.result !== "object")) return null;
    return candidate as unknown as SavedMatch;
  } catch { return null; }
}
