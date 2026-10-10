import type { JevDecisionResult, JevQuestion, JevScoreAnswer } from "../jev/types";
import type { TacticalAssessment, TacticalJudgment, TacticalSignal } from "./tacticalTypes";
import { finiteNumber, isRecord } from "./tacticalGuards";

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
