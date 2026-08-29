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
  it("keeps the current match number until the next pair is drawn", () => {
    const result = selectStat(createMatch(player, opponent, 10, 7), "power");
    expect(result.match.matchNumber).toBe(7);
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
    const resolved = selectStat(createMatch(player, opponent, 3), "power").match;
    const next = nextMatch(resolved, nextPlayer, nextOpponent);
    expect(next.player.id).toBe(nextPlayer.id);
    expect(next.opponent.id).toBe(nextOpponent.id);
    expect(next.matchNumber).toBe(2);
    expect(next.phase).toBe("selecting");
  });
  it("keeps the player's judoka and replaces the opponent in Champion mode", () => {
    const first = selectStat(createMatch(player, opponent, 3, 1, { player: 0, opponent: 0 }, "champion"), "power");
    const second = selectStat(nextMatch(first.match, nextPlayer, nextOpponent), "power");
    expect(second.match.player.id).toBe(player.id);
    expect(second.match.opponent.id).toBe(nextOpponent.id);
    expect(first.playerValue).toBe(9);
    expect(second.playerValue).toBe(9);
  });
  it("summarises a completed match with its decisive stat and champion streak", () => {
    const completed = selectStat(createMatch(player, opponent, 1, 3, { player: 0, opponent: 0 }, "champion"), "power").match;
    expect(matchSummary(completed, [
      { outcome: "player", stat: "technique" },
      { outcome: "player", stat: "power" },
      { outcome: "draw", stat: "power" }
    ])).toEqual({
      score: "1–0",
      decisiveStat: "power",
      playerWins: 2,
      championStreak: 2
    });
  });
});
