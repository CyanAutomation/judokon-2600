import { describe, expect, it } from "vitest";
import { createMatch, selectStat } from "./game";
import { parseSavedMatch, stringifySavedMatch, type SavedMatch } from "./session";
import type { Judoka } from "../api/types";

const player: Judoka = { id: "player", slug: "player", firstname: "Player", surname: "One", country: "Testland", countryCode: "TT", weightClass: "-73", stats: { power: 9, speed: 4, technique: 5, kumikata: 6, newaza: 7 } };
const opponent: Judoka = { ...player, id: "opponent", slug: "opponent", firstname: "Opponent", surname: "Two" };
const result = selectStat(createMatch(player, opponent, 3), "power");
const validSavedMatch: SavedMatch = {
  version: 1,
  match: result.match,
  result,
  history: [{ outcome: "player", stat: "power", roundNumber: 1 }],
  activeSeed: "replay-seed",
  activeWeight: "-73",
  drawBuffer: [opponent]
};

function invalidSavedMatch(mutator: (saved: Record<string, unknown>) => void): string {
  const saved = JSON.parse(stringifySavedMatch(validSavedMatch)) as Record<string, unknown>;
  mutator(saved);
  return JSON.stringify(saved);
}

describe("saved matches", () => {
  it("round-trips an active match, result history, and prefetched judoka", () => {
    expect(parseSavedMatch(stringifySavedMatch(validSavedMatch))).toEqual(validSavedMatch);
  });

  it.each([
    { scenario: "malformed JSON", value: stringifySavedMatch(validSavedMatch).slice(0, -1) },
    { scenario: "unsupported version", value: invalidSavedMatch(saved => { saved.version = 2; }) },
    { scenario: "invalid match", value: invalidSavedMatch(saved => { (saved.match as Record<string, unknown>).phase = "finished"; }) },
    { scenario: "invalid history item", value: invalidSavedMatch(saved => { (saved.history as Array<Record<string, unknown>>)[0].stat = "stamina"; }) },
    { scenario: "invalid seed", value: invalidSavedMatch(saved => { saved.activeSeed = 42; }) },
    { scenario: "invalid weight", value: invalidSavedMatch(saved => { saved.activeWeight = 73; }) },
    { scenario: "invalid draw-buffer judoka", value: invalidSavedMatch(saved => {
      const judoka = (saved.drawBuffer as Array<Record<string, unknown>>)[0];
      (judoka.stats as Record<string, unknown>).power = "nine";
    }) },
    { scenario: "null storage input", value: null },
    { scenario: "empty storage input", value: "" }
  ])("rejects $scenario", ({ value }) => {
    expect(parseSavedMatch(value)).toBeNull();
  });
});
