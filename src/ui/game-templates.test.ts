import { expect, it } from "vitest";
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

it("presents the stat decision before opponent intel and keeps the scouting tip optional", () => {
  const match: Match = {
    player: judoka,
    opponent: { ...judoka, id: "opponent", slug: "opponent", firstname: "Rival" },
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
  const decision = root.querySelector('[aria-labelledby="decision-heading"]');
  const intel = root.querySelector('[aria-label="Opponent intel"]');
  const choices = root.querySelector('[aria-label="Stat selection"]');
  const tip = intel?.querySelector("details");

  expect(decision?.querySelector("h2")?.textContent).toBe("Choose a stat");
  expect(decision?.contains(intel ?? null)).toBe(true);
  expect(intel && choices && (intel.compareDocumentPosition(choices) & Node.DOCUMENT_POSITION_FOLLOWING) !== 0).toBe(true);
  expect(tip?.open).toBe(false);
  expect(tip?.textContent).toContain("exact values appear after your pick");
});

it("[REQ-UI-011] shows both fighter cards after the decision without repeating the player's name", () => {
  const match: Match = {
    player: judoka,
    opponent: { ...judoka, id: "opponent", slug: "opponent", firstname: "Rival" },
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
  const pair = root.querySelector(".head-to-head");
  const player = root.querySelector("details.fighter-card.player");
  const opponent = root.querySelector("details.fighter-card.opponent");

  expect(layout?.getAttribute("data-phase")).toBe("selecting");
  expect(guide!.compareDocumentPosition(scout!)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
  expect(scout!.compareDocumentPosition(stats!)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
  expect(stats!.compareDocumentPosition(pair!)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
  expect(pair!.contains(player!)).toBe(true);
  expect(pair!.contains(opponent!)).toBe(true);
  expect(player?.hasAttribute("open")).toBe(true);
  expect(opponent?.hasAttribute("open")).toBe(true);
  expect(root.textContent?.match(/Test Judoka/g)).toHaveLength(1);
  expect(Array.from(player?.querySelectorAll(".fighter-stat-value") ?? [], (value) => value.textContent))
    .toEqual(["8", "7", "9", "6", "5"]);
  expect(Array.from(opponent?.querySelectorAll(".fighter-stat-value") ?? [], (value) => value.textContent))
    .toEqual(["??", "??", "??", "??", "??"]);
});

it("[REQ-UI-011] reveals the opponent's stat values after a player selection", () => {
  const match: Match = {
    player: judoka,
    opponent: { ...judoka, id: "opponent", slug: "opponent", stats: { power: 4, speed: 6, technique: 8, kumikata: 7, newaza: 9 } },
    target: 3,
    matchNumber: 1,
    scores: { player: 0, opponent: 0 },
    mode: "classic",
    phase: "selecting",
    winner: null,
  };
  const current = state({ match, pendingStat: "power" });
  const root = document.createElement("div");
  root.innerHTML = game(match, current, createHelpers(current));

  expect(Array.from(root.querySelectorAll(".fighter-card.opponent .fighter-stat-value"), (value) => value.textContent))
    .toEqual(["4", "6", "8", "7", "9"]);
});

it("announces the opponent reveal to assistive technology", () => {
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
  const root = document.createElement("div");
  root.innerHTML = game(match, current, createHelpers(current));
  const commitment = root.querySelector('[aria-label="Opponent thinking"]');

  expect(commitment?.getAttribute("aria-live")).toBe("polite");
  expect(commitment?.textContent).toContain("Your opponent is sizing you up");
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

  const root = document.createElement("div");
  root.innerHTML = game(match, current, createHelpers(current));
  const summary = root.querySelector(".match-summary");
  const notes = root.querySelector('[aria-label="Dojo notes"]');

  expect(summary?.textContent).toContain("Technique · 2 wins from 2 picks");
  expect(notes?.textContent).toContain("Technique won 2 of 2 picks. Your go-to, Power, won 1 of 4.");
  expect(root.textContent).not.toContain("JEV says");
});

it("shows adaptation and momentum feedback only when match history supports it", () => {
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

  const root = document.createElement("div");
  root.innerHTML = game(match, current, createHelpers(current));
  const notes = root.querySelector('[aria-label="Dojo notes"]');

  expect(Array.from(notes?.querySelectorAll("p") ?? [], (message) => message.textContent?.trim()))
    .toEqual([
      "After a loss, you switched stats on 2 of 2 picks.",
      "After a win or loss streak, you switched stats on 1 of 1 pick."
    ]);
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

it("[REQ-UI-003] shows the head-to-head payoff before the next action and defers history", () => {
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

  const root = document.createElement("div");
  root.innerHTML = game(match, current, createHelpers(current));
  const pair = root.querySelector(".head-to-head");
  const player = root.querySelector(".head-to-head .fighter-card.player");
  const opponent = root.querySelector(".head-to-head .fighter-card.opponent");
  const history = root.querySelector("details.match-history");
  const resultPanel = root.querySelector(".result-panel");
  const next = root.querySelector("#next");

  expect(resultPanel?.nextElementSibling).toBe(pair);
  expect(pair?.contains(player ?? null)).toBe(true);
  expect(pair?.contains(opponent ?? null)).toBe(true);
  expect(pair!.compareDocumentPosition(next!) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  expect(opponent!.compareDocumentPosition(history!) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  expect(root.querySelector('[aria-label="Stat selection"]')).toBeNull();
  expect(root.querySelector(".fighter-card.player .fighter-result")?.textContent).toContain("Power");
  expect(root.querySelector(".fighter-card.player .fighter-result")?.textContent).toContain("8");
  expect(root.querySelector(".fighter-card.opponent .fighter-result")?.textContent).toContain("9");
  expect(root.querySelector("details.match-history")?.hasAttribute("open")).toBe(false);
});

it("[REQ-UI-003] shows the resolved comparison before replay and keeps the breakdown collapsed", () => {
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
  const root = document.createElement("div");
  root.innerHTML = game(match, current, createHelpers(current));
  const result = root.querySelector(".result-panel");
  const pair = root.querySelector(".head-to-head");
  const takeaway = root.querySelector('[aria-label="Match takeaway"]');
  const replay = root.querySelector("#replay");
  const replayDetails = root.querySelector("details.replay-details");
  const breakdown = root.querySelector("details.match-breakdown");

  expect(root.querySelector(".battle-layout")?.getAttribute("data-phase")).toBe("matchOver");
  expect(root.querySelector('[aria-label="Stat selection"]')).toBeNull();
  expect(result?.nextElementSibling).toBe(pair);
  expect(pair!.compareDocumentPosition(takeaway!) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  expect(takeaway!.compareDocumentPosition(replay!) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  expect(replay!.compareDocumentPosition(replayDetails!) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  expect(replayDetails!.compareDocumentPosition(breakdown!) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  expect(root.querySelector(".match-takeaway")?.textContent).toContain("Technique · 1 win from 1 pick");
  expect(root.querySelector("details.replay-details")?.hasAttribute("open")).toBe(false);
  expect(root.querySelector("details.replay-details #copy-seed")).not.toBeNull();
  expect(root.querySelector("details.match-breakdown")?.hasAttribute("open")).toBe(false);
  expect(root.querySelector(".fighter-card.player .fighter-result")?.textContent).toContain("Technique");
  expect(root.querySelector(".fighter-card.player .fighter-result")?.textContent).toContain("9");
  expect(root.querySelector(".match-summary")?.textContent).toContain("Best this match");
  expect(root.querySelector(".match-summary")?.textContent).toContain("Technique · 1 win from 1 pick");
});

it("[REQ-UI-011] keeps opponent stat values hidden until a match result or selection exists", () => {
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
  const current = state({ match, result: null });
  const root = document.createElement("div");
  root.innerHTML = game(match, current, createHelpers(current));

  expect(root.querySelector("details.fighter-card.player")).not.toBeNull();
  expect(root.querySelector("details.fighter-card.opponent")).not.toBeNull();
  expect(Array.from(root.querySelectorAll(".fighter-card.opponent .fighter-stat-value"), (value) => value.textContent))
    .toEqual(["??", "??", "??", "??", "??"]);
});

it("retains the Champion run record in the completed match breakdown", () => {
  const match: Match = {
    player: judoka,
    opponent: { ...judoka, id: "opponent", slug: "opponent" },
    target: 2,
    matchNumber: 4,
    scores: { player: 2, opponent: 1 },
    mode: "champion",
    phase: "matchOver",
    winner: "player",
  };
  const current = state({
    match,
    result: { match, outcome: "player", stat: "technique", playerValue: 9, opponentValue: 7 },
    history: [
      { stat: "power", outcome: "player", roundNumber: 1 },
      { stat: "speed", outcome: "opponent", roundNumber: 2 },
      { stat: "newaza", outcome: "draw", roundNumber: 3 },
      { stat: "technique", outcome: "player", roundNumber: 4 },
    ],
  });
  const root = document.createElement("div");
  root.innerHTML = game(match, current, createHelpers(current));

  const breakdown = root.querySelector(".match-summary");
  expect(breakdown?.textContent).toContain("Champion progress");
  expect(breakdown?.textContent).toContain("2–1–1");
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
