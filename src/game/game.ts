import { STAT_KEYS, type Judoka, type StatKey } from "../api/types";

export type Outcome = "player" | "opponent" | "draw";
export type Phase = "selecting" | "awaitingNext" | "matchOver";
export type Winner = Outcome | null;
export type GameMode = "classic" | "champion";
export const MAX_ROUNDS = 25;

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
  championRecord: { wins: number; losses: number; draws: number } | null;
}

export function createMatch(player: Judoka, opponent: Judoka, target: number, matchNumber = 1, scores = { player: 0, opponent: 0 }, mode: GameMode = "classic"): Match {
  if (!Number.isInteger(target) || target < 1) throw new Error("target must be a positive integer");
  return { player, opponent, target, matchNumber, scores, mode, phase: "selecting", winner: null };
}

/** Returns every stat tied for a judoka's highest rating, in the displayed stat order. */
export function strongestStats(judoka: Judoka): StatKey[] {
  const highest = Math.max(...Object.values(judoka.stats));
  return (Object.keys(judoka.stats) as StatKey[]).filter((stat) => judoka.stats[stat] === highest);
}

/**
 * Resolves a single stat selection in a match.
 * Compares player and opponent values for the chosen stat, determines the outcome,
 * updates scores, and checks for match completion (win/draw/continue).
 * 
 * @param match - The current match (must be in "selecting" phase)
 * @param stat - The stat chosen by the player
 * @returns MatchResult with outcome, values, and updated match state
 * @throws Error if match is not in selecting phase
 */

export function selectStat(match: Match, stat: StatKey): MatchResult {
  if (match.phase !== "selecting") throw new Error("match is not ready for a stat selection");
  const playerValue = match.player.stats[stat];
  const opponentValue = match.opponent.stats[stat];
  const outcome: Outcome = playerValue === opponentValue ? "draw" : playerValue > opponentValue ? "player" : "opponent";
  const scores = {
    player: match.scores.player + Number(outcome === "player"),
    opponent: match.scores.opponent + Number(outcome === "opponent")
  };
  const winner = calculateWinner(scores, match.target, match.matchNumber);
  return {
    outcome,
    stat,
    playerValue,
    opponentValue,
    match: { ...match, scores, phase: winner === null ? "awaitingNext" : "matchOver", winner }
  };
}

/**
 * Determines the match winner based on scores, target points, and round number.
 * Returns the winner (player/opponent/draw) or null if match is still in progress.
 * 
 * @param scores - Current match scores
 * @param target - Points needed to win
 * @param matchNumber - Current round number
 * @returns The winner, a draw outcome, or null if match continues
 */
function calculateWinner(scores: { player: number; opponent: number }, target: number, matchNumber: number): Winner {
  const hasWinner = scores.player >= target || scores.opponent >= target;
  if (hasWinner) {
    return scores.player > scores.opponent ? "player" : "opponent";
  }
  
  const capped = matchNumber >= MAX_ROUNDS;
  if (capped) {
    return scores.player === scores.opponent ? "draw" : scores.player > scores.opponent ? "player" : "opponent";
  }
  
  return null;
}

/** 
 * Advance a match with the next draw. Champion mode retains only the player's judoka. 
 * 
 * @param match - The current match (must be in "awaitingNext" phase)
 * @param nextPlayer - The next player judoka (used in classic mode)
 * @param nextOpponent - The next opponent judoka
 * @returns New match state with incremented matchNumber and next judokas
 * @throws Error if match is not in awaitingNext phase
 */
export function nextMatch(match: Match, nextPlayer: Judoka, nextOpponent: Judoka): Match {
  if (match.phase !== "awaitingNext") throw new Error("match is not ready for the next match");
  if (match.mode === "champion") return { ...match, opponent: nextOpponent, matchNumber: match.matchNumber + 1, phase: "selecting" };
  return createMatch(nextPlayer, nextOpponent, match.target, match.matchNumber + 1, match.scores, "classic");
}

/**
 * Summarizes match statistics from match state and history.
 * Calculates win rates, decisive stats, best-performing stats, and champion-specific metrics.
 * 
 * @param match - The current or completed match
 * @param history - Array of all stat selections and outcomes in the match
 * @returns MatchSummary with scores, decision stats, records, and streak info
 */
export function matchSummary(match: Match, history: MatchHistoryItem[]): MatchSummary {
  const playerWins = history.filter(({ outcome }) => outcome === "player").length;
  const championRecord = match.mode === "champion"
    ? {
        wins: playerWins,
        losses: history.filter(({ outcome }) => outcome === "opponent").length,
        draws: history.filter(({ outcome }) => outcome === "draw").length
      }
    : null;
  
  let championStreak = 0;
  if (match.mode === "champion") {
    for (let index = history.length - 1; index >= 0 && history[index]?.outcome === "player"; index -= 1) {
      championStreak += 1;
    }
  }
  
  const { decisiveStat } = aggregateStatistics(history);
  const { bestStat, bestStatWins, bestStatSelections } = selectBestStat(history);

  return {
    score: `${match.scores.player}–${match.scores.opponent}`,
    decisiveStat,
    bestStat,
    bestStatWins,
    bestStatSelections,
    playerWins,
    championStreak: match.mode === "champion" ? championStreak : null,
    championRecord
  };
}

/**
 * Aggregates selection statistics from match history.
 * Determines which stat was most frequently selected (decisiveStat if unique).
 * 
 * @param history - Array of stat selections from the match
 * @returns Object containing decisiveStat
 */
function aggregateStatistics(history: MatchHistoryItem[]): { decisiveStat: StatKey | null } {
  const counts = new Map<StatKey, number>();
  
  for (const { stat } of history) {
    counts.set(stat, (counts.get(stat) ?? 0) + 1);
  }
  
  const highestSelectionCount = Math.max(0, ...counts.values());
  const mostSelectedStats = [...counts]
    .filter(([, selections]) => selections === highestSelectionCount)
    .map(([stat]) => stat);
  
  const decisiveStat = mostSelectedStats.length === 1 ? mostSelectedStats[0] : null;
  
  return { decisiveStat };
}

/**
 * Determines the best-performing stat from match history.
 * Ranks stats by wins, win rate, and display order as tiebreakers.
 * 
 * @param history - Array of stat selections and outcomes from the match
 * @returns Object with best stat, win count, and selection count (or nulls if no wins)
 */
function selectBestStat(history: MatchHistoryItem[]): { bestStat: StatKey | null; bestStatWins: number; bestStatSelections: number } {
  const performance = new Map<StatKey, { wins: number; selections: number }>();
  
  for (const { stat, outcome } of history) {
    const current = performance.get(stat) ?? { wins: 0, selections: 0 };
    current.selections += 1;
    current.wins += Number(outcome === "player");
    performance.set(stat, current);
  }
  
  const best = [...performance.entries()]
    .filter(([, record]) => record.wins > 0)
    .sort(([aStat, a], [bStat, b]) => b.wins - a.wins
      || b.wins / b.selections - a.wins / a.selections
      || STAT_KEYS.indexOf(aStat) - STAT_KEYS.indexOf(bStat))[0];
  
  return {
    bestStat: best?.[0] ?? null,
    bestStatWins: best?.[1].wins ?? 0,
    bestStatSelections: best?.[1].selections ?? 0
  };
}
