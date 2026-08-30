import { describe, expect, it } from "vitest";
import { createMatch, matchSummary, nextMatch, selectStat } from "./game";
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

describe("Classic Battle game engine", () => {
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
  it("rejects a second stat choice for a resolved match", () => {
    const first = selectStat(createMatch(player, opponent, 3), "power");
    expect(() => selectStat(first.match, "technique")).toThrow("not ready for a stat selection");
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
    const completed = selectStat(createMatch(player, opponent, 2, 3, { player: 0, opponent: 0 }), "power").match;
    const summary = matchSummary(completed, [
      { outcome: "player", stat: "technique" },
      { outcome: "player", stat: "power" },
      { outcome: "draw", stat: "power" }
    ]);

    expect(summary).toMatchObject({
      score: "2–0",
      decisiveStat: "power",
    });
  });
  it("reports the win and selection counts for the best stat", () => {
    const completed = selectStat(createMatch(player, opponent, 2, 3, { player: 0, opponent: 0 }), "power").match;
    const summary = matchSummary(completed, [
      { outcome: "player", stat: "power" },
      { outcome: "opponent", stat: "power" },
      { outcome: "player", stat: "power" }
    ]);

    expect(summary).toMatchObject({
      bestStat: "power",
      bestStatWins: 2,
      bestStatSelections: 3
    });
  });
  it("calculates the Champion streak from the player's wins", () => {
    const completed = selectStat(createMatch(player, opponent, 2, 3, { player: 0, opponent: 0 }, "champion"), "power").match;
    const summary = matchSummary(completed, [
      { outcome: "player", stat: "technique" },
      { outcome: "opponent", stat: "technique" },
      { outcome: "player", stat: "power" }
    ]);

    expect(summary).toMatchObject({
      playerWins: 2,
      championStreak: 2
    });
  });
  it("prefers the more reliable stat when two selections have the same number of wins", () => {
    const completed = selectStat(createMatch(player, opponent, 1), "power").match;
    expect(matchSummary(completed, [
      { outcome: "player", stat: "power" },
      { outcome: "opponent", stat: "power" },
      { outcome: "player", stat: "speed" }
    ])).toMatchObject({
      bestStat: "speed",
      bestStatWins: 1,
      bestStatSelections: 1
    });
  });
  it("does not recommend a stat when the player did not win a round", () => {
    const completed = selectStat(createMatch(player, opponent, 1), "technique").match;
    expect(matchSummary(completed, [
      { outcome: "opponent", stat: "technique" },
      { outcome: "draw", stat: "speed" }
    ])).toMatchObject({
      bestStat: null,
      bestStatWins: 0,
      bestStatSelections: 0
    });
  });
});
