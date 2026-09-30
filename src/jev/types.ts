export interface JevScoreQuestion {
  type: "score";
  instructions: string;
  criteria: readonly string[];
}

export type JevQuestion = JevScoreQuestion;

export interface JevScoreAnswer {
  type: "score";
  score: number;
  confidence: number;
}

export interface JevDecisionResult {
  answers: Record<string, JevScoreAnswer>;
}

/** Provider-independent boundary for making one typed JEV decision request. */
export interface JevDecisionClient {
  decide(state: unknown, questions: Record<string, JevQuestion>): Promise<JevDecisionResult>;
}
