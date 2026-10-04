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
    tacticalAssessment: null,
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

  it("adds code-authored tactical insight beside the unchanged deterministic summary", () => {
    const opponent: Judoka = {
      ...judoka,
      id: "opponent",
      slug: "opponent",
      stats: { power: 9, speed: 7, technique: 7, kumikata: 6, newaza: 5 }
    };
    const match: Match = {
      player: judoka,
      opponent,
      target: 3,
      matchNumber: 6,
      scores: { player: 3, opponent: 2 },
      mode: "classic",
      phase: "matchOver",
      winner: "player"
    };
    const current = state({
      match,
      result: { match, outcome: "player", stat: "technique", playerValue: 9, opponentValue: 7 },
      tacticalAssessment: { missedOpportunity: true, overReliance: true },
      history: [
        { stat: "power", outcome: "opponent", roundNumber: 1 },
        { stat: "power", outcome: "draw", roundNumber: 2 },
        { stat: "power", outcome: "player", roundNumber: 3 },
        { stat: "power", outcome: "opponent", roundNumber: 4 },
        { stat: "technique", outcome: "player", roundNumber: 5 },
        { stat: "technique", outcome: "player", roundNumber: 6 }
      ]
    });

    const markup = game(match, current, createHelpers(current));

    expect(markup).toContain('class="surface panel match-summary"');
    expect(markup).toContain("Technique · 2/2 wins");
    expect(markup).toContain('class="surface panel tactical-insight"');
    expect(markup).toContain("Technique won 2/2 selections while Power, your most-used stat, won 1/4.");
    expect(markup).not.toContain("JEV says");
  });

  it("keeps the result, both judoka, and round history together before the decision controls", () => {
    const match: Match = {
      player: judoka,
      opponent: { ...judoka, id: "opponent", slug: "opponent", firstname: "Rival" },
      target: 3,
      matchNumber: 2,
      scores: { player: 0, opponent: 1 },
      mode: "classic",
      phase: "awaitingNext",
      winner: null,
    };
    const current = state({
      match,
      result: { match, outcome: "opponent", stat: "power", playerValue: 8, opponentValue: 9 },
      history: [{ stat: "power", outcome: "opponent", roundNumber: 1 }]
    });

    const markup = game(match, current, createHelpers(current));
    const result = markup.indexOf('class="surface panel result-panel outcome-opponent"');
    const player = markup.indexOf('class="surface panel fighter-card player"');
    const opponent = markup.indexOf('class="surface panel fighter-card opponent"');
    const history = markup.indexOf('aria-label="Round history"');
    const controls = markup.indexOf('aria-label="Stat selection"');

    expect(result).toBeGreaterThan(-1);
    expect(player).toBeGreaterThan(result);
    expect(opponent).toBeGreaterThan(player);
    expect(history).toBeGreaterThan(opponent);
    expect(controls).toBeGreaterThan(history);
  });

  it("makes the horizontally scrolling round history keyboard focusable and described", () => {
    const match: Match = {
      player: judoka,
      opponent: { ...judoka, id: "opponent", slug: "opponent" },
      target: 3,
      matchNumber: 2,
      scores: { player: 0, opponent: 1 },
      mode: "classic",
      phase: "awaitingNext",
      winner: null,
    };
    const current = state({
      match,
      result: { match, outcome: "opponent", stat: "power", playerValue: 8, opponentValue: 9 },
      history: [{ stat: "power", outcome: "opponent", roundNumber: 1 }]
    });

    const markup = game(match, current, createHelpers(current));

    expect(markup).toContain('<ol tabindex="0" aria-label="Round history. Use the left and right arrow keys to view all rounds.">');
  });
});
