import { describe, expect, it } from "vitest";
import type { Judoka } from "../api/types";
import type { Match, MatchResult } from "../game/game";
import type { GameState } from "../state";
import { game } from "./game-templates";
import { createHelpers } from "./helpers";
import { status } from "./helpers/status";

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
  it("puts the stat decision and opponent intel ahead of secondary guidance", () => {
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

    expect(markup).toContain("Choose a stat");
    expect(markup).not.toContain("The higher number wins the point.");
    expect(markup).toContain("Opponent top stats");
    expect(markup).toContain('<details class="scout-tip">');
    expect(markup).toContain('class="surface panel scoreboard"');
  });

  it("places the stat choices before collapsed fighter details and match history", () => {
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
    const root = document.createElement("div");
    root.innerHTML = game(match, current, createHelpers(current));
    const layout = root.querySelector(".battle-layout");
    const stats = root.querySelector('[aria-label="Stat selection"]');
    const guide = root.querySelector(".decision-heading");
    const scout = root.querySelector(".scout-report");
    const player = root.querySelector("details.fighter-card.player");

    expect(layout?.getAttribute("data-phase")).toBe("selecting");
    expect(guide!.compareDocumentPosition(scout!)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
    expect(scout!.compareDocumentPosition(stats!)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
    expect(stats!.compareDocumentPosition(player!)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
    expect(root.querySelector(".decision-player")?.textContent).toContain("Test Judoka");
    expect(player?.hasAttribute("open")).toBe(false);
  });

  it("uses the shared panel and live-region component for the opponent reveal", () => {
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
    const current = state({ match, pendingStat: "power" });
    const markup = game(match, current, createHelpers(current));
    const root = document.createElement("div");
    root.innerHTML = markup;
    const commitment = root.querySelector(".commitment");

    expect(commitment?.classList.contains("surface")).toBe(true);
    expect(commitment?.classList.contains("panel")).toBe(true);
    expect(commitment?.getAttribute("aria-live")).toBe("polite");
    expect(commitment?.getAttribute("aria-label")).toBe("Opponent thinking");
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
    expect(markup).toContain("Technique · 2 wins from 2 picks");
    expect(markup).toContain('class="surface panel tactical-insight"');
    expect(markup).toContain("Technique won 2 of 2 picks. Your go-to, Power, won 1 of 4.");
    expect(markup).not.toContain("JEV says");
  });

  it("renders only evidence-backed adaptation and momentum messages", () => {
    const match: Match = {
      player: judoka,
      opponent: { ...judoka, id: "opponent", slug: "opponent" },
      target: 3,
      matchNumber: 7,
      scores: { player: 3, opponent: 2 },
      mode: "classic",
      phase: "matchOver",
      winner: "player"
    };
    const current = state({
      match,
      result: { match, outcome: "player", stat: "speed", playerValue: 8, opponentValue: 7 },
      tacticalAssessment: { adaptation: true, momentumResponse: true },
      history: [
        { stat: "power", outcome: "opponent", roundNumber: 1 },
        { stat: "technique", outcome: "player", roundNumber: 2 },
        { stat: "technique", outcome: "player", roundNumber: 3 },
        { stat: "power", outcome: "opponent", roundNumber: 4 },
        { stat: "speed", outcome: "player", roundNumber: 5 }
      ]
    });

    const markup = game(match, current, createHelpers(current));

    expect(markup).toContain("After a loss, you switched stats on 2 of 2 picks.");
    expect(markup).toContain("After a win or loss streak, you switched stats on 1 of 1 pick.");
    expect(markup).toContain("Dojo notes");
    expect(markup).toContain('<details class="match-breakdown">');
    expect(markup).not.toContain("Optional tactical insight");
  });

  it("omits an insight when the claimed signal has no supporting transitions", () => {
    const match: Match = {
      player: judoka,
      opponent: { ...judoka, id: "opponent", slug: "opponent" },
      target: 3,
      matchNumber: 8,
      scores: { player: 1, opponent: 1 },
      mode: "classic",
      phase: "matchOver",
      winner: null
    };
    const current = state({
      match,
      result: { match, outcome: "draw", stat: "power", playerValue: 8, opponentValue: 8 },
      tacticalAssessment: { adaptation: true },
      history: [
        { stat: "power", outcome: "player", roundNumber: 1 },
        { stat: "power", outcome: "opponent", roundNumber: 2 }
      ]
    });

    expect(game(match, current, createHelpers(current))).not.toContain('class="surface panel tactical-insight"');
  });

  it("uses the same playful outcome copy for result panels and status updates", () => {
    const match: Match = {
      player: judoka,
      opponent: { ...judoka, id: "opponent", slug: "opponent" },
      target: 3,
      matchNumber: 2,
      scores: { player: 3, opponent: 2 },
      mode: "classic",
      phase: "matchOver",
      winner: "draw",
    };
    const result: MatchResult = { match, outcome: "draw", stat: "power", playerValue: 8, opponentValue: 8 };
    const current = state({ match, result });
    const markup = game(match, current, createHelpers(current));
    const root = document.createElement("div");
    root.innerHTML = markup;
    const resultCopy = root.querySelector(".result-panel .eyebrow")?.textContent;

    expect(resultCopy).toBe("It’s a draw!");
    expect(status(current)).toBe(`>> ${resultCopy}`);
  });

  it("keeps the next action beside the result and defers fighter details and history", () => {
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
    const resultView = document.createElement("div");
    resultView.innerHTML = markup;

    expect(result).toBeGreaterThan(-1);
    expect(markup.indexOf('id="next"')).toBeGreaterThan(result);
    expect(player).toBeGreaterThan(markup.indexOf('id="next"'));
    expect(opponent).toBeGreaterThan(player);
    expect(history).toBeGreaterThan(opponent);
    expect(markup).not.toContain('aria-label="Stat selection"');
    expect(resultView.querySelector("details.fighter-card")?.hasAttribute("open")).toBe(false);
    expect(resultView.querySelector(".fighter-card.player .selected-stat")?.textContent).toContain("Power");
    expect(resultView.querySelector("details.match-history")?.hasAttribute("open")).toBe(false);
  });

  it("brings the result and replay actions forward, with a collapsed match breakdown", () => {
    const match: Match = {
      player: judoka,
      opponent: { ...judoka, id: "opponent", slug: "opponent" },
      target: 3,
      matchNumber: 1,
      scores: { player: 3, opponent: 1 },
      mode: "classic",
      phase: "matchOver",
      winner: "player",
    };
    const current = state({
      match,
      result: { match, outcome: "player", stat: "technique", playerValue: 9, opponentValue: 7 },
      history: [{ stat: "technique", outcome: "player", roundNumber: 1 }],
    });
    const markup = game(match, current, createHelpers(current));
    const root = document.createElement("div");
    root.innerHTML = markup;

    expect(root.querySelector(".battle-layout")?.getAttribute("data-phase")).toBe("matchOver");
    expect(root.querySelector('[aria-label="Stat selection"]')).toBeNull();
    expect(markup.indexOf('id="replay"')).toBeGreaterThan(markup.indexOf('class="surface panel result-panel outcome-player"'));
    expect(markup.indexOf('aria-label="Match takeaway"')).toBeLessThan(markup.indexOf('id="replay"'));
    expect(markup.indexOf('id="replay"')).toBeLessThan(markup.indexOf('<details class="replay-details'));
    expect(markup.indexOf('<details class="replay-details')).toBeLessThan(markup.indexOf('<details class="match-breakdown">'));
    expect(root.querySelector(".match-takeaway")?.textContent).toContain("Technique · 1 win from 1 pick");
    expect(root.querySelector("details.replay-details")?.hasAttribute("open")).toBe(false);
    expect(root.querySelector("details.replay-details #copy-seed")).not.toBeNull();
    expect(root.querySelector("details.match-breakdown")?.hasAttribute("open")).toBe(false);
    expect(root.querySelector(".match-summary")?.textContent).toContain("Best this match");
    expect(root.querySelector(".match-summary")?.textContent).toContain("Technique · 1 win from 1 pick");
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

    const root = document.createElement("div");
    root.innerHTML = game(match, current, createHelpers(current));
    const history = root.querySelector<HTMLOListElement>(
      'ol[aria-label="Round history. Use the left and right arrow keys to view all rounds."]'
    );

    expect(history).not.toBeNull();
    expect(history?.tabIndex).toBe(0);
    expect(history?.closest("details")?.hasAttribute("open")).toBe(false);
  });
});
