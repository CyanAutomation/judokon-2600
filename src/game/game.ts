import type { Judoka, StatKey } from "../api/types";

export type Outcome = "player" | "opponent" | "draw";
export type Phase = "selecting" | "awaitingNext" | "matchOver";
export type Winner = Outcome | null;
export type GameMode = "classic" | "champion";

export interface Match {
  player: Judoka;
  opponent: Judoka;
  target: number;
  matchNumber: number;
  scores: { player: number; opponent: number };
  mode: GameMode;
  phase: Phase;
  winner: Winner;
}

export interface MatchResult {
  outcome: Outcome;
  stat: StatKey;
  playerValue: number;
  opponentValue: number;
  match: Match;
}

export interface MatchHistoryItem {
  outcome: Outcome;
  stat: StatKey;
}

export interface MatchSummary {
  score: string;
  decisiveStat: StatKey | null;
  playerWins: number;
  championStreak: number | null;
}

export function createMatch(player: Judoka, opponent: Judoka, target: number, matchNumber = 1, scores = { player: 0, opponent: 0 }, mode: GameMode = "classic"): Match {
  if (!Number.isInteger(target) || target < 1) throw new Error("target must be a positive integer");
  return { player, opponent, target, matchNumber, scores, mode, phase: "selecting", winner: null };
}

export function selectStat(match: Match, stat: StatKey): MatchResult {
  if (match.phase !== "selecting") throw new Error("match is not ready for a stat selection");
  const playerValue = match.player.stats[stat];
  const opponentValue = match.opponent.stats[stat];
  const outcome: Outcome = playerValue === opponentValue ? "draw" : playerValue > opponentValue ? "player" : "opponent";
  const scores = {
    player: match.scores.player + Number(outcome === "player"),
    opponent: match.scores.opponent + Number(outcome === "opponent")
  };
  const hasWinner = scores.player >= match.target || scores.opponent >= match.target;
  const capped = match.matchNumber >= 25;
  const winner: Winner = hasWinner ? (scores.player > scores.opponent ? "player" : "opponent") : capped ? (scores.player === scores.opponent ? "draw" : scores.player > scores.opponent ? "player" : "opponent") : null;
  return {
    outcome,
    stat,
    playerValue,
    opponentValue,
    match: { ...match, scores, phase: winner === null ? "awaitingNext" : "matchOver", winner }
  };
}

/** Advance a match with the next draw. Champion mode retains only the player's judoka. */
export function nextMatch(match: Match, nextPlayer: Judoka, nextOpponent: Judoka): Match {
  if (match.phase !== "awaitingNext") throw new Error("match is not ready for the next match");
  if (match.mode === "champion") return { ...match, opponent: nextOpponent, matchNumber: match.matchNumber + 1, phase: "selecting" };
  return createMatch(nextPlayer, nextOpponent, match.target, match.matchNumber + 1, match.scores, "classic");
}

export function matchSummary(match: Match, history: MatchHistoryItem[]): MatchSummary {
  const playerWins = history.filter(({ outcome }) => outcome === "player").length;
  const counts = new Map<StatKey, number>();
  for (const { stat } of history) counts.set(stat, (counts.get(stat) ?? 0) + 1);
  const decisiveStat = [...counts].sort(([, a], [, b]) => b - a)[0]?.[0] ?? null;
  return {
    score: `${match.scores.player}–${match.scores.opponent}`,
    decisiveStat,
    playerWins,
    championStreak: match.mode === "champion" ? playerWins : null
  };
}
