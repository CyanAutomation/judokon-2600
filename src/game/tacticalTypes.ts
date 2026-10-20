import type { StatKey } from "../api/types.js";
import type { JevScoreAnswer } from "../jev/types.js";

export type TacticalSignal = "overReliance" | "adaptation" | "missedOpportunity" | "momentumResponse";
export type TacticalAssessment = Partial<Record<TacticalSignal, true>>;
export type TacticalOutcome = "win" | "loss" | "draw";
export type TacticalAssessmentIssue = "not_configured" | "invalid_api_key" | "unavailable";

export interface TacticalAssessmentResult {
  assessment: TacticalAssessment | null;
  issue?: TacticalAssessmentIssue;
}

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
