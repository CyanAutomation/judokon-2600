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
  /** The uniquely most-selected stat, or null when no stat was selected or selections are tied. */
  decisiveStat: StatKey | null;
  bestStat: StatKey | null;
  bestStatWins: number;
  bestStatSelections: number;
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
  const performance = new Map<StatKey, { wins: number; selections: number }>();
  for (const { stat, outcome } of history) {
    counts.set(stat, (counts.get(stat) ?? 0) + 1);
    const current = performance.get(stat) ?? { wins: 0, selections: 0 };
    current.selections += 1;
    current.wins += Number(outcome === "player");
    performance.set(stat, current);
  }
  const highestSelectionCount = Math.max(0, ...counts.values());
  const mostSelectedStats = [...counts]
    .filter(([, selections]) => selections === highestSelectionCount)
    .map(([stat]) => stat);
  const decisiveStat = mostSelectedStats.length === 1 ? mostSelectedStats[0] : null;
  const best = [...performance.entries()]
    .filter(([, record]) => record.wins > 0)
    .sort(([, a], [, b]) => b.wins - a.wins || b.wins / b.selections - a.wins / a.selections || b.selections - a.selections)[0];
  return {
    score: `${match.scores.player}–${match.scores.opponent}`,
    decisiveStat,
    bestStat: best?.[0] ?? null,
    bestStatWins: best?.[1].wins ?? 0,
    bestStatSelections: best?.[1].selections ?? 0,
    playerWins,
    championStreak: match.mode === "champion" ? playerWins : null
  };
}
