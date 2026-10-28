import { STAT_KEYS, type Judoka, type StatKey } from "../api/types.js";

export type Outcome = "player" | "opponent" | "draw";
export type Phase = "selecting" | "awaitingNext" | "matchOver";
export type Winner = Outcome | null;
export type GameMode = "classic" | "champion";
const MAX_ROUNDS = 25;

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
  const tally = tallyStatRecords(history);
  const decisiveStat = mostSelectedStat(tally)?.stat ?? null;
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
  const tally = tallyStatRecords(history);
  const best = STAT_KEYS
    .filter((stat) => tally[stat].wins > 0)
    .sort((aStat, bStat) => {
      const a = tally[aStat];
      const b = tally[bStat];
      return b.wins - a.wins
        || b.wins / b.selected - a.wins / a.selected
        || STAT_KEYS.indexOf(aStat) - STAT_KEYS.indexOf(bStat);
    })[0];

  return {
    bestStat: best ?? null,
    bestStatWins: best ? tally[best].wins : 0,
    bestStatSelections: best ? tally[best].selected : 0
  };
}

export interface StatTallyRecord {
  selected: number;
  wins: number;
  losses: number;
  draws: number;
  winRate: number | null;
}

export type StatTally = Record<StatKey, StatTallyRecord>;

/**
 * Returns the uniquely most-selected stat from a per-stat selection tally,
 * or null when no stat is selected or the highest count is tied.
 *
 * @param tally - Per-stat selection counts, in STAT_KEYS display order
 * @returns The unique most-selected stat with its count, or null
 */
export function mostSelectedStat(tally: Record<StatKey, { selected: number }>): { stat: StatKey; count: number } | null {
  const highestSelectionCount = Math.max(0, ...STAT_KEYS.map((stat) => tally[stat]!.selected));
  const mostSelectedStats = STAT_KEYS.filter((stat) => tally[stat]!.selected === highestSelectionCount);
  if (mostSelectedStats.length !== 1) return null;
  const stat = mostSelectedStats[0]!;
  return { stat, count: highestSelectionCount };
}

/**
 * Tally per-stat selection and outcome counts from match history, including the
 * win rate for each stat (null when the stat was never selected). Single source
 * of truth shared by match-summary ranking and tactical-feature extraction.
 *
 * @param history - Array of stat selections and outcomes from the match
 * @returns Per-stat tally keyed by stat, in STAT_KEYS display order
 */
export function tallyStatRecords(history: MatchHistoryItem[]): StatTally {
  const tally = Object.fromEntries(STAT_KEYS.map((stat) => [stat, { selected: 0, wins: 0, losses: 0, draws: 0, winRate: null }])) as StatTally;

  for (const { stat, outcome } of history) {
    const record = tally[stat];
    record.selected += 1;
    if (outcome === "player") record.wins += 1;
    else if (outcome === "opponent") record.losses += 1;
    else record.draws += 1;
  }

  for (const stat of STAT_KEYS) {
    const record = tally[stat];
    record.winRate = record.selected ? record.wins / record.selected : null;
  }

  return tally;
}
