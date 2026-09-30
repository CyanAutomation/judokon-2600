import { STAT_KEYS, type StatKey } from "../api/types";
import type { JevDecisionResult, JevQuestion, JevScoreAnswer } from "../jev/types";
import type { MatchHistoryItem, Outcome } from "./game";

export type TacticalSignal = "overReliance" | "adaptation" | "missedOpportunity" | "momentumResponse";
export type TacticalAssessment = Partial<Record<TacticalSignal, true>>;
export type TacticalOutcome = "win" | "loss" | "draw";

export interface TacticalStatRecord {
  selected: number;
  wins: number;
  losses: number;
  draws: number;
  winRate: number | null;
}

export interface TacticalFeatures {
  score: { player: number; opponent: number };
  scoreDifferential: number;
  rounds: number;
  selections: Record<StatKey, TacticalStatRecord>;
  distinctStatsSelected: number;
  longestRepeatedStatSequence: number;
  repeatedFailedSelections: number;
  statSwitches: number;
  choicesAfterLosses: { decisions: number; switches: number };
  choicesAfterWins: { decisions: number; switches: number };
  choicesAfterWinRuns: { decisions: number; switches: number };
  choicesAfterLossRuns: { decisions: number; switches: number };
  recentOutcomes: TacticalOutcome[];
  missedOpportunityCandidate: {
    favoredStat: StatKey;
    favoredWinRate: number;
    alternativeStat: StatKey;
    alternativeWinRate: number;
  } | null;
}

export interface TacticalJudgment {
  overReliance: JevScoreAnswer;
  adaptation: JevScoreAnswer;
  missedOpportunity: JevScoreAnswer;
  momentumResponse: JevScoreAnswer;
}

export const TACTICAL_CONFIDENCE_THRESHOLD = 0.7;
export const TACTICAL_SIGNAL_SCORE_THRESHOLD = 1.5;

const SCORE_CRITERIA = [
  "No clear pattern is present, or the sample is too short or mixed to support this interpretation.",
  "There is some evidence of this pattern, but it is limited or mixed.",
  "There is a clear and repeated pattern in the player's known selections and round outcomes."
] as const;

export const TACTICAL_QUESTIONS: Record<TacticalSignal, JevQuestion> = {
  overReliance: {
    type: "score",
    instructions: "Does the match show clear over-reliance on one stat: repeated use despite poor results with that stat? Use only the supplied selection counts, outcomes, and repetition features.",
    criteria: SCORE_CRITERIA
  },
  adaptation: {
    type: "score",
    instructions: "After losing rounds, did the player's later stat choices show a meaningful change in approach? Consider choicesAfterLosses and the recent outcomes; do not infer opponent values.",
    criteria: SCORE_CRITERIA
  },
  missedOpportunity: {
    type: "score",
    instructions: "Is there a clear missed opportunity: a materially better-performing alternative stat while choices remained concentrated on a weaker-performing stat? Use the supplied candidate and its selection evidence.",
    criteria: SCORE_CRITERIA
  },
  momentumResponse: {
    type: "score",
    instructions: "Did the player's stat choices show a consistent response after runs of wins or losses, rather than isolated changes? Use only the supplied run-choice features.",
    criteria: SCORE_CRITERIA
  }
};

function mapOutcome(outcome: Outcome): TacticalOutcome {
  if (outcome === "player") return "win";
  if (outcome === "opponent") return "loss";
  return "draw";
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
  let longestRepeatedStatSequence = 0;
  let currentRepeatedStatSequence = 0;
  let repeatedFailedSelections = 0;
  let statSwitches = 0;
  const choicesAfterLosses = { decisions: 0, switches: 0 };
  const choicesAfterWins = { decisions: 0, switches: 0 };
  const choicesAfterWinRuns = { decisions: 0, switches: 0 };
  const choicesAfterLossRuns = { decisions: 0, switches: 0 };

  history.forEach(({ outcome, stat }, index) => {
    const record = selections[stat];
    record.selected += 1;
    if (outcome === "player") record.wins += 1;
    else if (outcome === "opponent") record.losses += 1;
    else record.draws += 1;

    if (index === 0 || history[index - 1]!.stat !== stat) {
      currentRepeatedStatSequence = 1;
      if (index > 0) statSwitches += 1;
    } else {
      currentRepeatedStatSequence += 1;
      if (history[index - 1]!.outcome === "opponent") repeatedFailedSelections += 1;
    }
    longestRepeatedStatSequence = Math.max(longestRepeatedStatSequence, currentRepeatedStatSequence);

    if (index === 0) return;
    const previous = history[index - 1]!;
    const switched = stat !== previous.stat;

    if (previous.outcome === "opponent") {
      choicesAfterLosses.decisions += 1;
      choicesAfterLosses.switches += Number(switched);
    } else if (previous.outcome === "player") {
      choicesAfterWins.decisions += 1;
      choicesAfterWins.switches += Number(switched);
    }

    if (index >= 2) {
      const priorPrior = history[index - 2]!;
      if (previous.outcome === "player" && priorPrior.outcome === "player") {
        choicesAfterWinRuns.decisions += 1;
        choicesAfterWinRuns.switches += Number(switched);
      } else if (previous.outcome === "opponent" && priorPrior.outcome === "opponent") {
        choicesAfterLossRuns.decisions += 1;
        choicesAfterLossRuns.switches += Number(switched);
      }
    }
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
    longestRepeatedStatSequence,
    repeatedFailedSelections,
    statSwitches,
    choicesAfterLosses,
    choicesAfterWins,
    choicesAfterWinRuns,
    choicesAfterLossRuns,
    recentOutcomes: history.slice(-5).map(({ outcome }) => mapOutcome(outcome)),
    missedOpportunityCandidate: findMissedOpportunityCandidate(selections)
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function finiteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function parseAnswer(value: unknown): JevScoreAnswer | null {
  if (!isRecord(value) || value.type !== "score" || !finiteNumber(value.score) || value.score < 0 || value.score > 2) return null;
  if (!finiteNumber(value.confidence) || value.confidence < 0 || value.confidence > 1) return null;
  return { type: "score", score: value.score, confidence: value.confidence };
}

/** Validate JEV's typed result before confidence policy is applied. */
export function parseTacticalJudgment(value: unknown): TacticalJudgment | null {
  if (!isRecord(value) || !isRecord(value.answers)) return null;
  const answers = value.answers as Record<string, unknown>;
  const parsed = Object.fromEntries(Object.keys(TACTICAL_QUESTIONS).map((signal) => [signal, parseAnswer(answers[signal])])) as Record<TacticalSignal, JevScoreAnswer | null>;
  if (Object.values(parsed).some((answer) => answer === null)) return null;
  return parsed as TacticalJudgment;
}

/** Central confidence and signal-strength gate. No uncertain or synthetic result is emitted. */
export function applyTacticalConfidencePolicy(judgment: TacticalJudgment): TacticalAssessment | null {
  const assessment: TacticalAssessment = {};
  for (const signal of Object.keys(TACTICAL_QUESTIONS) as TacticalSignal[]) {
    const answer = judgment[signal];
    if (answer.confidence >= TACTICAL_CONFIDENCE_THRESHOLD && answer.score >= TACTICAL_SIGNAL_SCORE_THRESHOLD) {
      assessment[signal] = true;
    }
  }
  return Object.keys(assessment).length ? assessment : null;
}

export function assessmentFromJev(result: JevDecisionResult): TacticalAssessment | null {
  const judgment = parseTacticalJudgment(result);
  return judgment ? applyTacticalConfidencePolicy(judgment) : null;
}

function boundedInteger(value: unknown, max: number): value is number {
  return Number.isInteger(value) && (value as number) >= 0 && (value as number) <= max;
}

/**
 * Rebuild a strict allow-listed feature object at the server boundary. Unknown
 * properties, including any opponent data supplied by a caller, are discarded.
 */
export function sanitizeTacticalFeatures(value: unknown): TacticalFeatures | null {
  if (!isRecord(value) || !isRecord(value.score) || !isRecord(value.selections)) return null;
  const rounds = value.rounds;
  if (!boundedInteger(rounds, 25)) return null;
  const score = value.score;
  if (!boundedInteger(score.player, rounds) || !boundedInteger(score.opponent, rounds)) return null;
  if (score.player + score.opponent > rounds) return null;
  if (!boundedInteger(value.scoreDifferential, 25) && !(Number.isInteger(value.scoreDifferential) && (value.scoreDifferential as number) >= -25 && (value.scoreDifferential as number) <= 25)) return null;
  if (value.scoreDifferential !== (score.player as number) - (score.opponent as number)) return null;
  if (!boundedInteger(value.distinctStatsSelected, STAT_KEYS.length) || value.distinctStatsSelected > rounds) return null;
  if (!boundedInteger(value.longestRepeatedStatSequence, rounds) || !boundedInteger(value.repeatedFailedSelections, rounds)) return null;
  if (!boundedInteger(value.statSwitches, Math.max(0, rounds - 1))) return null;

  const selections = {} as Record<StatKey, TacticalStatRecord>;
  for (const stat of STAT_KEYS) {
    const record = value.selections[stat];
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

  const totalSelected = STAT_KEYS.reduce((total, stat) => total + selections[stat].selected, 0);
  const totalWins = STAT_KEYS.reduce((total, stat) => total + selections[stat].wins, 0);
  const totalLosses = STAT_KEYS.reduce((total, stat) => total + selections[stat].losses, 0);
  const distinctStatsSelected = STAT_KEYS.filter((stat) => selections[stat].selected > 0).length;
  if (totalSelected !== rounds || totalWins !== score.player || totalLosses !== score.opponent || distinctStatsSelected !== value.distinctStatsSelected) return null;

  const expectedMissedOpportunity = findMissedOpportunityCandidate(selections);

  const choiceKeys = ["choicesAfterLosses", "choicesAfterWins", "choicesAfterWinRuns", "choicesAfterLossRuns"] as const;
  const choices = {} as Pick<TacticalFeatures, typeof choiceKeys[number]>;
  for (const key of choiceKeys) {
    const pair = value[key];
    if (!isRecord(pair) || !boundedInteger(pair.decisions, rounds) || !boundedInteger(pair.switches, pair.decisions as number)) return null;
    choices[key] = { decisions: pair.decisions as number, switches: pair.switches as number };
  }

  if (!Array.isArray(value.recentOutcomes) || value.recentOutcomes.length !== Math.min(rounds, 5)
    || !value.recentOutcomes.every((outcome) => outcome === "win" || outcome === "loss" || outcome === "draw")) return null;

  let missedOpportunityCandidate: TacticalFeatures["missedOpportunityCandidate"] = null;
  if (value.missedOpportunityCandidate !== null) {
    const candidate = value.missedOpportunityCandidate;
    if (!isRecord(candidate) || !STAT_KEYS.includes(candidate.favoredStat as StatKey) || !STAT_KEYS.includes(candidate.alternativeStat as StatKey)
      || candidate.favoredStat === candidate.alternativeStat || !finiteNumber(candidate.favoredWinRate) || candidate.favoredWinRate < 0 || candidate.favoredWinRate > 1
      || !finiteNumber(candidate.alternativeWinRate) || candidate.alternativeWinRate < 0 || candidate.alternativeWinRate > 1) return null;
    const suppliedCandidate = {
      favoredStat: candidate.favoredStat as StatKey,
      favoredWinRate: candidate.favoredWinRate,
      alternativeStat: candidate.alternativeStat as StatKey,
      alternativeWinRate: candidate.alternativeWinRate
    };
    if (!expectedMissedOpportunity
      || suppliedCandidate.favoredStat !== expectedMissedOpportunity.favoredStat
      || suppliedCandidate.favoredWinRate !== expectedMissedOpportunity.favoredWinRate
      || suppliedCandidate.alternativeStat !== expectedMissedOpportunity.alternativeStat
      || suppliedCandidate.alternativeWinRate !== expectedMissedOpportunity.alternativeWinRate) return null;
    missedOpportunityCandidate = expectedMissedOpportunity;
  } else if (expectedMissedOpportunity) {
    return null;
  }

  return {
    score: { player: score.player as number, opponent: score.opponent as number },
    scoreDifferential: value.scoreDifferential as number,
    rounds,
    selections,
    distinctStatsSelected,
    longestRepeatedStatSequence: value.longestRepeatedStatSequence as number,
    repeatedFailedSelections: value.repeatedFailedSelections as number,
    statSwitches: value.statSwitches as number,
    ...choices,
    recentOutcomes: [...value.recentOutcomes] as TacticalOutcome[],
    missedOpportunityCandidate
  };
}
