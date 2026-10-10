import { STAT_KEYS, type StatKey } from "../api/types";
import type { MatchHistoryItem, Outcome } from "./game";
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

function recordSelection(selections: Record<StatKey, TacticalStatRecord>, round: MatchHistoryItem): void {
  const record = selections[round.stat];
  record.selected += 1;
  if (round.outcome === "player") record.wins += 1;
  else if (round.outcome === "opponent") record.losses += 1;
  else record.draws += 1;
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
  const selections = Object.fromEntries(STAT_KEYS.map((stat) => [stat, { selected: 0, wins: 0, losses: 0, draws: 0, winRate: null }])) as Record<StatKey, TacticalStatRecord>;
  const counts = createFeatureCounts();
  history.forEach((round, index) => {
    recordSelection(selections, round);
    recordRepeatedStatSequence(history, index, round, counts);
    recordChoiceAfterPreviousOutcome(history, index, round, counts);
  });

  for (const stat of STAT_KEYS) {
    const record = selections[stat]!;
    record.winRate = record.selected ? record.wins / record.selected : null;
  }

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

function sanitizeSelections(value: unknown, rounds: number): Record<StatKey, TacticalStatRecord> | null {
  if (!isRecord(value)) return null;
  const selections = {} as Record<StatKey, TacticalStatRecord>;
  for (const stat of STAT_KEYS) {
    const record = value[stat];
    if (!isRecord(record)
      || !boundedInteger(record.selected, rounds)
      || !boundedInteger(record.wins, record.selected as number)
      || !boundedInteger(record.losses, record.selected as number)
      || !boundedInteger(record.draws, record.selected as number)
      || (record.wins as number) + (record.losses as number) + (record.draws as number) !== record.selected) return null;
    const winRate = record.selected === 0 ? null : record.wins as number / (record.selected as number);
    if (record.winRate !== winRate) return null;
    selections[stat] = {
      selected: record.selected as number,
      wins: record.wins as number,
      losses: record.losses as number,
      draws: record.draws as number,
      winRate
    };
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

function matchesMissedOpportunityCandidate(
  supplied: unknown,
  expected: TacticalFeatures["missedOpportunityCandidate"]
): boolean {
  if (supplied === null) return expected === null;
  if (!expected || !isRecord(supplied)
    || !STAT_KEYS.includes(supplied.favoredStat as StatKey)
    || !STAT_KEYS.includes(supplied.alternativeStat as StatKey)
    || supplied.favoredStat === supplied.alternativeStat
    || !finiteNumber(supplied.favoredWinRate)
    || !finiteNumber(supplied.alternativeWinRate)) return false;
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
