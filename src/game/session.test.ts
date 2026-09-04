import { describe, expect, it } from "vitest";
import { createMatch, selectStat } from "./game";
import { parseSavedMatch, stringifySavedMatch, type SavedMatch } from "./session";
import type { Judoka } from "../api/types";

const player: Judoka = { id: "player", slug: "player", firstname: "Player", surname: "One", country: "Testland", countryCode: "TT", weightClass: "-73", stats: { power: 9, speed: 4, technique: 5, kumikata: 6, newaza: 7 } };
const opponent: Judoka = { ...player, id: "opponent", slug: "opponent", firstname: "Opponent", surname: "Two" };

describe("saved matches", () => {
  it("round-trips an active match, result history, and prefetched judoka", () => {
    const result = selectStat(createMatch(player, opponent, 3), "power");
    const saved: SavedMatch = {
      version: 1,
      match: result.match,
      result,
      history: [{ outcome: "player", stat: "power", roundNumber: 1 }],
      activeSeed: "replay-seed",
      activeWeight: "-73",
      drawBuffer: [opponent]
    };

    expect(parseSavedMatch(stringifySavedMatch(saved))).toEqual(saved);
  });

  it("rejects malformed or incompatible session data", () => {
    expect(parseSavedMatch("not json")).toBeNull();
    expect(parseSavedMatch(JSON.stringify({ version: 2 }))).toBeNull();
  });
});
