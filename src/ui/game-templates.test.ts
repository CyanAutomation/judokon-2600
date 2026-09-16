import { describe, expect, it } from "vitest";
import type { Judoka } from "../api/types";
import type { Match } from "../game/game";
import type { GameState } from "../state";
import { game } from "./game-templates";
import { createHelpers } from "./helpers";

function state(overrides: Partial<GameState> = {}): GameState {
  return {
    match: null,
    result: null,
    pendingStat: null,
    activeSeed: "",
    activeWeight: undefined,
    drawBuffer: [],
    target: 3,
    lengthIndex: 0,
    busy: false,
    errorMessage: "",
    history: [],
    division: "absolute",
    mode: "classic",
    weight: "random",
    replaySeed: "",
    seedMessage: "",
    ...overrides,
  };
}

const judoka: Judoka = {
  id: "player",
  slug: "player",
  firstname: "Test",
  surname: "Judoka",
  country: "Japan",
  countryCode: "JP",
  weightClass: "-73",
  rarity: "common",
  stats: { power: 8, speed: 7, technique: 9, kumikata: 6, newaza: 5 },
};

describe("game templates", () => {
  it("explains how a stat choice is resolved before the stat buttons", () => {
    const match: Match = {
      player: judoka,
      opponent: { ...judoka, id: "opponent", slug: "opponent" },
      target: 3,
      matchNumber: 1,
      scores: { player: 0, opponent: 0 },
      mode: "classic",
      phase: "selecting",
      winner: null,
    };
    const current = state({ match });
    const markup = game(match, current, createHelpers(current));

    expect(markup).toContain("The higher value wins the exchange.");
    expect(markup.indexOf("The higher value wins the exchange.")).toBeLessThan(markup.indexOf('aria-label="Stat selection"'));
  });
});
