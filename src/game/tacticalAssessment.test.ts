import { describe, expect, it } from "vitest";
import type { JevDecisionResult } from "../jev/types";
import type { MatchHistoryItem } from "./game";
import {
  applyTacticalConfidencePolicy,
  assessmentFromJev,
  extractTacticalFeatures,
  parseTacticalJudgment,
  sanitizeTacticalFeatures,
  TACTICAL_CONFIDENCE_THRESHOLD,
  TACTICAL_QUESTIONS,
  TACTICAL_SIGNAL_SCORE_THRESHOLD,
  type TacticalSignal
} from "./tacticalAssessment";

const signals: TacticalSignal[] = ["overReliance", "adaptation", "missedOpportunity", "momentumResponse"];

function history(rounds: Array<[MatchHistoryItem["stat"], MatchHistoryItem["outcome"]]>): MatchHistoryItem[] {
  return rounds.map(([stat, outcome]) => ({ stat, outcome }));
}

function scoreFor(rounds: MatchHistoryItem[]) {
  return {
    player: rounds.filter(({ outcome }) => outcome === "player").length,
    opponent: rounds.filter(({ outcome }) => outcome === "opponent").length
  };
}

function resultFor(score: number, confidence = 0.9): JevDecisionResult {
  return {
    answers: Object.fromEntries(signals.map((signal) => [signal, { type: "score" as const, score, confidence }]))
  };
}

describe("tactical feature extraction", () => {
  it("summarizes obvious over-reliance without retaining raw history", () => {
    const rounds = history([
      ["power", "opponent"],
      ["power", "opponent"],
      ["power", "opponent"],
      ["technique", "player"],
      ["power", "opponent"]
    ]);
    const features = extractTacticalFeatures(scoreFor(rounds), rounds);

    expect(features.selections.power).toEqual({ selected: 4, wins: 0, losses: 4, draws: 0, winRate: 0 });
    expect(features.longestRepeatedStatSequence).toBe(3);
    expect(features.repeatedFailedSelections).toBe(2);
    expect(features.recentOutcomes).toEqual(["loss", "loss", "loss", "win", "loss"]);
    expect(JSON.stringify(features)).not.toMatch(/opponentValue|opponentStats|hidden/);
  });

  it("counts adaptation after losses and derives a material alternative candidate", () => {
    const rounds = history([
      ["power", "opponent"],
      ["power", "draw"],
      ["power", "player"],
      ["power", "opponent"],
      ["technique", "player"],
      ["technique", "player"]
    ]);
    const features = extractTacticalFeatures(scoreFor(rounds), rounds);

    expect(features.choicesAfterLosses).toEqual({ decisions: 2, switches: 1 });
    expect(features.missedOpportunityCandidate).toEqual({
      favoredStat: "power",
      favoredWinRate: 0.25,
      alternativeStat: "technique",
      alternativeWinRate: 1
    });
  });

  it("labels broad exploration as variety and leaves mixed evidence ambiguous", () => {
    const balanced = history([
      ["power", "player"],
      ["speed", "opponent"],
      ["technique", "draw"],
      ["kumikata", "player"],
      ["newaza", "opponent"]
    ]);
    const ambiguous = history([
      ["power", "player"],
      ["power", "opponent"],
      ["speed", "player"],
      ["technique", "opponent"]
    ]);

    expect(extractTacticalFeatures(scoreFor(balanced), balanced).distinctStatsSelected).toBe(5);
    expect(extractTacticalFeatures(scoreFor(ambiguous), ambiguous).missedOpportunityCandidate).toBeNull();
  });

  it("does not derive a favored stat when no stats were selected", () => {
    expect(extractTacticalFeatures({ player: 0, opponent: 0 }, []).missedOpportunityCandidate).toBeNull();
  });

  it("is deterministic, does not mutate the match history, and contains no seed or opponent values", () => {
    const rounds = history([["power", "opponent"], ["technique", "player"], ["technique", "player"]]);
    const before = structuredClone(rounds);
    const first = extractTacticalFeatures(scoreFor(rounds), rounds);
    const second = extractTacticalFeatures(scoreFor(rounds), rounds);

    expect(first).toEqual(second);
    expect(rounds).toEqual(before);
    expect(first).not.toHaveProperty("replaySeed");
    expect(first).not.toHaveProperty("opponent");
    expect(first).not.toHaveProperty("judoka");
  });
});

describe("JEV result parsing and confidence policy", () => {
  it("keeps the decision request to four bounded score questions", () => {
    expect(Object.keys(TACTICAL_QUESTIONS)).toEqual(signals);
    expect(Object.values(TACTICAL_QUESTIONS).every((question) => question.type === "score" && question.criteria.length === 3)).toBe(true);
  });

  it("parses typed score answers and rejects missing or malformed answers", () => {
    expect(parseTacticalJudgment(resultFor(1.7))).not.toBeNull();
    expect(parseTacticalJudgment({ answers: { overReliance: { type: "noul", noul: 0.99 } } })).toBeNull();
    expect(parseTacticalJudgment(resultFor(2).answers)).toBeNull();
    expect(parseTacticalJudgment(resultFor(Number.NaN))).toBeNull();
    expect(parseTacticalJudgment(resultFor(2, 1.1))).toBeNull();
  });

  it("shows only clear signals that pass the central confidence threshold", () => {
    const judgment = parseTacticalJudgment(resultFor(TACTICAL_SIGNAL_SCORE_THRESHOLD, TACTICAL_CONFIDENCE_THRESHOLD));
    expect(judgment).not.toBeNull();
    expect(applyTacticalConfidencePolicy(judgment!)).toEqual({
      overReliance: true,
      adaptation: true,
      missedOpportunity: true,
      momentumResponse: true
    });

    expect(assessmentFromJev(resultFor(1.9, TACTICAL_CONFIDENCE_THRESHOLD - 0.01))).toBeNull();
    expect(assessmentFromJev(resultFor(TACTICAL_SIGNAL_SCORE_THRESHOLD - 0.01))).toBeNull();
  });
});

describe("server-boundary feature allow-list", () => {
  it("discards identifying fields and hidden opponent stats", () => {
    const rounds = history([["power", "opponent"], ["technique", "player"], ["technique", "player"]]);
    const features = extractTacticalFeatures(scoreFor(rounds), rounds);
    const sanitized = sanitizeTacticalFeatures({
      ...features,
      player: { id: "private-player" },
      opponent: { stats: { power: 999, secret: "hidden" } },
      replaySeed: "private-seed",
      localStorage: { token: "private-token" }
    });

    expect(sanitized).toEqual(features);
    expect(JSON.stringify(sanitized)).not.toMatch(/private|hidden|999|secret/);
  });

  it("rejects inconsistent derived counts", () => {
    const rounds = history([["power", "player"], ["speed", "opponent"]]);
    const features = extractTacticalFeatures(scoreFor(rounds), rounds);
    expect(sanitizeTacticalFeatures({ ...features, rounds: 25 })).toBeNull();
  });
});
