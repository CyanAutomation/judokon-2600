import { describe, expect, it } from "vitest";
import { createMatch, selectStat } from "./game";
import type { Judoka } from "../api/types";

const player: Judoka = {
  id: "player", slug: "player", firstname: "Player", surname: "One", country: "Testland", countryCode: "TT", weightClass: "-73",
  stats: { power: 9, speed: 4, technique: 5, kumikata: 6, newaza: 7 }
};
const opponent: Judoka = {
  ...player, id: "opponent", slug: "opponent", firstname: "Opponent",
  stats: { power: 7, speed: 4, technique: 8, kumikata: 6, newaza: 8 }
};

describe("Classic Battle game engine", () => {
  it("awards a point for a higher selected stat and progresses to the next round", () => {
    const result = selectStat(createMatch(player, opponent, 3), "power");
    expect(result.outcome).toBe("player");
    expect(result.match.scores).toEqual({ player: 1, opponent: 0 });
    expect(result.match.phase).toBe("awaitingNext");
    expect(result.match.round).toBe(1);
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
  it("keeps the current round number until the next pair is drawn", () => {
    const result = selectStat(createMatch(player, opponent, 10, 7), "power");
    expect(result.match.round).toBe(7);
  });
  it("ends an unresolved match after the twenty-fifth played round", () => {
    const result = selectStat(createMatch(player, opponent, 10, 25, { player: 3, opponent: 3 }), "speed");
    expect(result.match.phase).toBe("matchOver");
    expect(result.match.winner).toBe("draw");
  });
  it("rejects a second stat choice for a resolved round", () => {
    const first = selectStat(createMatch(player, opponent, 3), "power");
    expect(() => selectStat(first.match, "technique")).toThrow("not ready for a stat selection");
  });
});
