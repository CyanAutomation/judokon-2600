/**
 * Shared test utilities and mock factories
 * Used across all test files to reduce duplication
 */

import type { Judoka } from "../api/types";
import type { Match, MatchResult } from "../game/game";
import type { GameState } from "../state";

/**
 * Creates a mock judoka for testing
 */
export function createMockJudoka(
  id: string,
  overrides?: Partial<Judoka>
): Judoka {
  return {
    id,
    slug: id,
    firstname: "Test",
    surname: "Fighter",
    country: "Japan",
    countryCode: "JP",
    weightClass: "-73",
    stats: { power: 5, speed: 5, technique: 5, kumikata: 5, newaza: 5 },
    ...overrides
  };
}

/**
 * Creates a mock match for testing
 */
export function createMockMatch(overrides?: Partial<Match>): Match {
  return {
    player: createMockJudoka("player"),
    opponent: createMockJudoka("opponent"),
    phase: "selecting",
    scores: { player: 0, opponent: 0 },
    target: 3,
    matchNumber: 1,
    mode: "classic",
    winner: null,
    ...overrides
  };
}

/**
 * Creates a mock match result for testing
 */
export function createMockMatchResult(): MatchResult {
  return {
    match: createMockMatch(),
    outcome: "player",
    stat: "power",
    playerValue: 8,
    opponentValue: 5
  };
}

/**
 * Creates a mock game state for testing
 */
export function createMockGameState(
  overrides?: Partial<GameState>
): GameState {
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
    setupStep: "length",
    ...overrides
  };
}

/**
 * Creates a mock keyboard event for testing
 */
export function createKeyboardEvent(
  key: string,
  options?: Partial<KeyboardEventInit>
): KeyboardEvent {
  return new KeyboardEvent("keydown", { key, ...options });
}

/**
 * Creates a mock click event for testing
 */
export function createClickEvent(target: Element): MouseEvent {
  const event = new MouseEvent("click", { bubbles: true });
  Object.defineProperty(event, "target", { value: target, enumerable: true });
  return event;
}

/**
 * Creates a mock change event for testing
 */
export function createChangeEvent(target: HTMLElement): Event {
  const event = new Event("change", { bubbles: true });
  Object.defineProperty(event, "target", { value: target, enumerable: true });
  return event;
}

/**
 * Creates a mock button element for testing
 */
export function createMockButton(id: string): HTMLButtonElement {
  const button = document.createElement("button");
  button.id = id;
  return button;
}
