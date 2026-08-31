import { describe, expect, it } from "vitest";
import { createMatch, matchSummary, nextMatch, selectStat, strongestStats } from "./game";
import type { GameMode, MatchHistoryItem } from "./game";
import type { Judoka } from "../api/types";

const player: Judoka = {
  id: "player", slug: "player", firstname: "Player", surname: "One", country: "Testland", countryCode: "TT", weightClass: "-73",
  stats: { power: 9, speed: 4, technique: 5, kumikata: 6, newaza: 7 }
};
const opponent: Judoka = {
  ...player, id: "opponent", slug: "opponent", firstname: "Opponent",
  stats: { power: 7, speed: 4, technique: 8, kumikata: 6, newaza: 8 }
};
const nextPlayer: Judoka = { ...player, id: "next-player", firstname: "Next" };
const nextOpponent: Judoka = { ...opponent, id: "next-opponent", firstname: "Next opponent" };

function completedMatch(history: MatchHistoryItem[], mode: GameMode = "classic") {
  const scores = history.reduce((total, { outcome }) => ({
    player: total.player + Number(outcome === "player"),
    opponent: total.opponent + Number(outcome === "opponent")
  }), { player: 0, opponent: 0 });
  const winner = scores.player > scores.opponent
    ? "player" as const
    : scores.player < scores.opponent
      ? "opponent" as const
      : null;

  return {
    ...createMatch(player, opponent, 2, history.length, scores, mode),
    phase: "matchOver" as const,
    winner
  };
}

describe("Classic Battle game engine", () => {
  it("identifies every strongest stat for a scout report", () => {
    expect(strongestStats(player)).toEqual(["power"]);
    expect(strongestStats({ ...player, stats: { ...player.stats, technique: 9 } })).toEqual(["power", "technique"]);
  });
  it("awards a point for a higher selected stat and progresses to the next match", () => {
    const result = selectStat(createMatch(player, opponent, 3), "power");
    expect(result.outcome).toBe("player");
    expect(result.match.scores).toEqual({ player: 1, opponent: 0 });
    expect(result.match.phase).toBe("awaitingNext");
    expect(result.match.matchNumber).toBe(1);
  });
  it("does not award points for a draw", () => {
    const result = selectStat(createMatch(player, opponent, 3), "speed");
    expect(result.outcome).toBe("draw");
    expect(result.match.scores).toEqual({ player: 0, opponent: 0 });
  });
  it("ends a match when its configured target is reached", () => {
    const result = selectStat(createMatch(player, opponent, 1), "power");
    expect(result.match.phase).toBe("matchOver");
    expect(result.match.winner).toBe("player");
  });
  it("ends an unresolved match after the twenty-fifth played match", () => {
    const result = selectStat(createMatch(player, opponent, 10, 25, { player: 3, opponent: 3 }), "speed");
    expect(result.match.phase).toBe("matchOver");
    expect(result.match.winner).toBe("draw");
  });
  it.each([
    ["awaitingNext phase", selectStat(createMatch(player, opponent, 3), "power").match],
    ["matchOver phase", selectStat(createMatch(player, opponent, 1), "power").match]
  ])("rejects a stat choice in the %s", (_label, match) => {
    expect(() => selectStat(match, "technique")).toThrow("match is not ready for a stat selection");
  });
  it("replaces both judoka between Classic matches", () => {
    const resolved = selectStat(createMatch(player, opponent, 3, 7, { player: 1, opponent: 1 }), "power").match;

    const next = nextMatch(resolved, nextPlayer, nextOpponent);
    expect(next).toMatchObject({
      player: nextPlayer,
      opponent: nextOpponent,
      target: 3,
      matchNumber: 8,
      scores: { player: 2, opponent: 1 },
      mode: "classic",
      phase: "selecting",
      winner: null
    });
  });
  it("keeps the player's judoka and replaces the opponent in Champion mode", () => {
    const resolved = selectStat(createMatch(player, opponent, 3, 1, { player: 0, opponent: 0 }, "champion"), "power").match;

    const next = nextMatch(resolved, nextPlayer, nextOpponent);
    expect(next).toMatchObject({
      player,
      opponent: nextOpponent,
      target: 3,
      matchNumber: 2,
      scores: { player: 1, opponent: 0 },
      mode: "champion",
      phase: "selecting"
    });
  });
  it("formats the score and identifies the most-selected decisive stat", () => {
    const history: MatchHistoryItem[] = [
      { outcome: "player", stat: "technique" },
      { outcome: "player", stat: "power" },
      { outcome: "draw", stat: "power" }
    ];
    const summary = matchSummary(completedMatch(history), history);

    expect(summary).toMatchObject({
      score: "2–0",
      decisiveStat: "power",
    });
  });
  it("does not identify a decisive stat when selections are tied", () => {
    const history: MatchHistoryItem[] = [
      { outcome: "player", stat: "power" },
      { outcome: "opponent", stat: "technique" }
    ];

    expect(matchSummary(completedMatch(history), history).decisiveStat).toBeNull();
  });
  it.each([
    {
      scenario: "a clear winner",
      history: [
        { outcome: "player", stat: "power" },
        { outcome: "opponent", stat: "power" },
        { outcome: "player", stat: "power" }
      ] satisfies MatchHistoryItem[],
      bestStat: "power",
      bestStatWins: 2,
      bestStatSelections: 3
    },
    {
      scenario: "equal wins with different success rates",
      history: [
        { outcome: "player", stat: "power" },
        { outcome: "opponent", stat: "power" },
        { outcome: "player", stat: "speed" }
      ] satisfies MatchHistoryItem[],
      bestStat: "speed",
      bestStatWins: 1,
      bestStatSelections: 1
    },
    {
      scenario: "no wins",
      history: [
        { outcome: "opponent", stat: "technique" },
        { outcome: "draw", stat: "speed" }
      ] satisfies MatchHistoryItem[],
      bestStat: null,
      bestStatWins: 0,
      bestStatSelections: 0
    }
  ])("recommends the best stat for $scenario", ({ history, bestStat, bestStatWins, bestStatSelections }) => {
    const summary = matchSummary(completedMatch(history), history);

    expect(summary.bestStat).toBe(bestStat);
    expect(summary.bestStatWins).toBe(bestStatWins);
    expect(summary.bestStatSelections).toBe(bestStatSelections);
  });
  it("reports a Champion run's record and its current consecutive-win streak", () => {
    const history: MatchHistoryItem[] = [
      { outcome: "player", stat: "technique" },
      { outcome: "opponent", stat: "technique" },
      { outcome: "draw", stat: "speed" },
      { outcome: "player", stat: "power" },
      { outcome: "player", stat: "power" }
    ];
    const summary = matchSummary(completedMatch(history, "champion"), history);

    expect(summary).toMatchObject({
      playerWins: 3,
      championStreak: 2,
      championRecord: { wins: 3, losses: 1, draws: 1 }
    });
  });

  it("does not expose Champion-only progress for a Classic Battle", () => {
    const history: MatchHistoryItem[] = [{ outcome: "player", stat: "power" }];
    const summary = matchSummary(completedMatch(history), history);

    expect(summary.championStreak).toBeNull();
    expect(summary.championRecord).toBeNull();
  });
});
