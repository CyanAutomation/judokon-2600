import { STAT_KEYS, type StatKey } from "../api/types";
import { tallyStatRecords, type MatchHistoryItem, type Outcome } from "./game";
import type { TacticalFeatures, TacticalOutcome, TacticalStatRecord } from "./tacticalTypes";
import { finiteNumber, isRecord } from "./tacticalGuards";

function mapOutcome(outcome: Outcome): TacticalOutcome {
  if (outcome === "player") return "win";
  if (outcome === "opponent") return "loss";
  return "draw";
}

interface TacticalFeatureCounts {
  longestRepeatedStatSequence: number;
  currentRepeatedStatSequence: number;
  repeatedFailedSelections: number;
  statSwitches: number;
  choicesAfterLosses: TacticalFeatures["choicesAfterLosses"];
  choicesAfterWins: TacticalFeatures["choicesAfterWins"];
  choicesAfterWinRuns: TacticalFeatures["choicesAfterWinRuns"];
  choicesAfterLossRuns: TacticalFeatures["choicesAfterLossRuns"];
}

function createFeatureCounts(): TacticalFeatureCounts {
  return {
    longestRepeatedStatSequence: 0,
    currentRepeatedStatSequence: 0,
    repeatedFailedSelections: 0,
    statSwitches: 0,
    choicesAfterLosses: { decisions: 0, switches: 0 },
    choicesAfterWins: { decisions: 0, switches: 0 },
    choicesAfterWinRuns: { decisions: 0, switches: 0 },
    choicesAfterLossRuns: { decisions: 0, switches: 0 }
  };
}

function recordRepeatedStatSequence(
  history: MatchHistoryItem[],
  index: number,
  round: MatchHistoryItem,
  counts: TacticalFeatureCounts
): void {
  const previous = history[index - 1];
  if (!previous || previous.stat !== round.stat) {
    counts.currentRepeatedStatSequence = 1;
    if (previous) counts.statSwitches += 1;
  } else {
    counts.currentRepeatedStatSequence += 1;
    if (previous.outcome === "opponent") counts.repeatedFailedSelections += 1;
  }
  counts.longestRepeatedStatSequence = Math.max(
    counts.longestRepeatedStatSequence,
    counts.currentRepeatedStatSequence
  );
}

function recordChoiceAfterPreviousOutcome(
  history: MatchHistoryItem[],
  index: number,
  round: MatchHistoryItem,
  counts: TacticalFeatureCounts
): void {
  const previous = history[index - 1];
  if (!previous) return;

  const switched = Number(round.stat !== previous.stat);
  if (previous.outcome === "opponent") {
    counts.choicesAfterLosses.decisions += 1;
    counts.choicesAfterLosses.switches += switched;
  } else if (previous.outcome === "player") {
    counts.choicesAfterWins.decisions += 1;
    counts.choicesAfterWins.switches += switched;
  }

  const beforePrevious = history[index - 2];
  if (!beforePrevious) return;
  if (previous.outcome === "player" && beforePrevious.outcome === "player") {
    counts.choicesAfterWinRuns.decisions += 1;
    counts.choicesAfterWinRuns.switches += switched;
  } else if (previous.outcome === "opponent" && beforePrevious.outcome === "opponent") {
    counts.choicesAfterLossRuns.decisions += 1;
    counts.choicesAfterLossRuns.switches += switched;
  }
}

function findMissedOpportunityCandidate(
  selections: Record<StatKey, TacticalStatRecord>
): TacticalFeatures["missedOpportunityCandidate"] {
  const highestSelectionCount = Math.max(0, ...STAT_KEYS.map((stat) => selections[stat].selected));
  const favoredStats = STAT_KEYS.filter((stat) => selections[stat].selected === highestSelectionCount);
  if (highestSelectionCount < 2 || favoredStats.length !== 1) return null;

  const favoredStat = favoredStats[0]!;
  const favored = selections[favoredStat]!;
  if (favored.winRate === null || favored.winRate > 0.5) return null;

  const alternatives = STAT_KEYS
    .filter((stat) => stat !== favoredStat && selections[stat].selected >= 2 && selections[stat].winRate !== null)
    .sort((a, b) => selections[b]!.winRate! - selections[a]!.winRate! || STAT_KEYS.indexOf(a) - STAT_KEYS.indexOf(b));
  const alternativeStat = alternatives[0];
  if (!alternativeStat) return null;
  const alternativeWinRate = selections[alternativeStat]!.winRate!;
  if (alternativeWinRate - favored.winRate < 0.25 || alternativeWinRate <= 0.5) return null;

  return { favoredStat, favoredWinRate: favored.winRate, alternativeStat, alternativeWinRate };
}

/** Build compact facts from only the player's recorded choices and round outcomes. */
export function extractTacticalFeatures(
  score: { player: number; opponent: number },
  history: MatchHistoryItem[]
): TacticalFeatures {
  const selections = tallyStatRecords(history);
  const counts = createFeatureCounts();
  history.forEach((round, index) => {
    recordRepeatedStatSequence(history, index, round, counts);
    recordChoiceAfterPreviousOutcome(history, index, round, counts);
  });

  return {
    score: { player: score.player, opponent: score.opponent },
    scoreDifferential: score.player - score.opponent,
    rounds: history.length,
    selections,
    distinctStatsSelected: STAT_KEYS.filter((stat) => selections[stat]!.selected > 0).length,
    longestRepeatedStatSequence: counts.longestRepeatedStatSequence,
    repeatedFailedSelections: counts.repeatedFailedSelections,
    statSwitches: counts.statSwitches,
    choicesAfterLosses: counts.choicesAfterLosses,
    choicesAfterWins: counts.choicesAfterWins,
    choicesAfterWinRuns: counts.choicesAfterWinRuns,
    choicesAfterLossRuns: counts.choicesAfterLossRuns,
    recentOutcomes: history.slice(-5).map(({ outcome }) => mapOutcome(outcome)),
    missedOpportunityCandidate: findMissedOpportunityCandidate(selections)
  };
}

function boundedInteger(value: unknown, max: number): value is number {
  return Number.isInteger(value) && (value as number) >= 0 && (value as number) <= max;
}

function boundedSignedInteger(value: unknown, maxAbsoluteValue: number): value is number {
  return Number.isInteger(value)
    && (value as number) >= -maxAbsoluteValue
    && (value as number) <= maxAbsoluteValue;
}

function validateScore(score: unknown, differential: unknown, rounds: number): score is Record<string, unknown> {
  if (!isRecord(score)
    || !boundedInteger(score.player, rounds)
    || !boundedInteger(score.opponent, rounds)
    || (score.player as number) + (score.opponent as number) > rounds
    || !boundedSignedInteger(differential, 25)) return false;
  return differential === (score.player as number) - (score.opponent as number);
}

function sanitizeSelectionRecord(value: unknown, rounds: number): TacticalStatRecord | null {
  if (!isRecord(value)) return null;

  const { selected, wins, losses, draws } = value;
  if (!boundedInteger(selected, rounds)) return null;

  const outcomes = [wins, losses, draws];
  if (!outcomes.every((count) => boundedInteger(count, selected))) return null;
  if ((wins as number) + (losses as number) + (draws as number) !== selected) return null;

  const winRate = selected === 0 ? null : (wins as number) / selected;
  if (value.winRate !== winRate) return null;

  return {
    selected,
    wins: wins as number,
    losses: losses as number,
    draws: draws as number,
    winRate
  };
}

function sanitizeSelections(value: unknown, rounds: number): Record<StatKey, TacticalStatRecord> | null {
  if (!isRecord(value)) return null;

  const selections = {} as Record<StatKey, TacticalStatRecord>;
  for (const stat of STAT_KEYS) {
    const selection = sanitizeSelectionRecord(value[stat], rounds);
    if (!selection) return null;
    selections[stat] = selection;
  }
  return selections;
}

function hasConsistentSelectionTotals(
  selections: Record<StatKey, TacticalStatRecord>,
  rounds: number,
  score: Record<string, unknown>,
  declaredDistinctStats: unknown
): boolean {
  const totalSelected = STAT_KEYS.reduce((total, stat) => total + selections[stat].selected, 0);
  const totalWins = STAT_KEYS.reduce((total, stat) => total + selections[stat].wins, 0);
  const totalLosses = STAT_KEYS.reduce((total, stat) => total + selections[stat].losses, 0);
  const distinctStatsSelected = STAT_KEYS.filter((stat) => selections[stat].selected > 0).length;
  return totalSelected === rounds
    && totalWins === score.player
    && totalLosses === score.opponent
    && distinctStatsSelected === declaredDistinctStats;
}

function sanitizeChoiceTransitions(value: unknown, rounds: number): Pick<
  TacticalFeatures,
  "choicesAfterLosses" | "choicesAfterWins" | "choicesAfterWinRuns" | "choicesAfterLossRuns"
> | null {
  if (!isRecord(value)) return null;
  const keys = ["choicesAfterLosses", "choicesAfterWins", "choicesAfterWinRuns", "choicesAfterLossRuns"] as const;
  const choices = {} as Pick<TacticalFeatures, typeof keys[number]>;
  for (const key of keys) {
    const pair = value[key];
    if (!isRecord(pair)
      || !boundedInteger(pair.decisions, rounds)
      || !boundedInteger(pair.switches, pair.decisions as number)) return null;
    choices[key] = { decisions: pair.decisions as number, switches: pair.switches as number };
  }
  return choices;
}

function isRecentOutcomes(value: unknown, rounds: number): value is TacticalOutcome[] {
  return Array.isArray(value)
    && value.length === Math.min(rounds, 5)
    && value.every((outcome) => outcome === "win" || outcome === "loss" || outcome === "draw");
}

function isMissedOpportunityCandidate(value: unknown): value is Record<string, unknown> {
  return isRecord(value)
    && STAT_KEYS.includes(value.favoredStat as StatKey)
    && STAT_KEYS.includes(value.alternativeStat as StatKey)
    && value.favoredStat !== value.alternativeStat
    && finiteNumber(value.favoredWinRate)
    && finiteNumber(value.alternativeWinRate);
}

function matchesMissedOpportunityCandidate(
  supplied: unknown,
  expected: TacticalFeatures["missedOpportunityCandidate"]
): boolean {
  if (supplied === null) return expected === null;
  if (!expected || !isMissedOpportunityCandidate(supplied)) return false;
  return supplied.favoredStat === expected.favoredStat
    && supplied.favoredWinRate === expected.favoredWinRate
    && supplied.alternativeStat === expected.alternativeStat
    && supplied.alternativeWinRate === expected.alternativeWinRate;
}

/**
 * Rebuild a strict allow-listed feature object at the server boundary. Unknown
 * properties, including any opponent data supplied by a caller, are discarded.
 */
export function sanitizeTacticalFeatures(value: unknown): TacticalFeatures | null {
  if (!isRecord(value)) return null;
  const rounds = value.rounds;
  if (!boundedInteger(rounds, 25)) return null;
  const score = value.score;
  if (!validateScore(score, value.scoreDifferential, rounds)
    || !boundedInteger(value.distinctStatsSelected, STAT_KEYS.length)
    || value.distinctStatsSelected > rounds
    || !boundedInteger(value.longestRepeatedStatSequence, rounds)
    || !boundedInteger(value.repeatedFailedSelections, rounds)
    || !boundedInteger(value.statSwitches, Math.max(0, rounds - 1))) return null;

  const selections = sanitizeSelections(value.selections, rounds);
  if (!selections || !hasConsistentSelectionTotals(selections, rounds, score, value.distinctStatsSelected)) return null;
  const choices = sanitizeChoiceTransitions(value, rounds);
  if (!choices || !isRecentOutcomes(value.recentOutcomes, rounds)) return null;

  const missedOpportunityCandidate = findMissedOpportunityCandidate(selections);
  if (!matchesMissedOpportunityCandidate(value.missedOpportunityCandidate, missedOpportunityCandidate)) return null;

  return {
    score: { player: score.player as number, opponent: score.opponent as number },
    scoreDifferential: value.scoreDifferential as number,
    rounds,
    selections,
    distinctStatsSelected: value.distinctStatsSelected as number,
    longestRepeatedStatSequence: value.longestRepeatedStatSequence as number,
    repeatedFailedSelections: value.repeatedFailedSelections as number,
    statSwitches: value.statSwitches as number,
    ...choices,
    recentOutcomes: [...value.recentOutcomes] as TacticalOutcome[],
    missedOpportunityCandidate
  };
}
