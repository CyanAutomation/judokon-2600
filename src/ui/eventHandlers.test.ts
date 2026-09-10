import { describe, expect, it, vi } from "vitest";
import {
  handleClickEvent,
  handleChangeEvent,
  handleToggleEvent,
  handleIntroKeyboard,
  handleMatchKeyboard
} from "./eventHandlers";
import type { GameState } from "../state";
import type { Match } from "../game/game";
import type { Judoka, StatKey } from "../api/types";

// Helper to create mock judoka
function createMockJudoka(id: string): Judoka {
  return {
    id,
    slug: id,
    firstname: "Test",
    surname: "Fighter",
    country: "Japan",
    countryCode: "JP",
    weightClass: "-73",
    stats: { power: 5, speed: 5, technique: 5, kumikata: 5, newaza: 5 }
  };
}

// Helper to create mock match
function createMockMatch(overrides?: Partial<Match>): Match {
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

// Helper to create mock game state
function createMockGameState(overrides?: Partial<GameState>): GameState {
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
    ...overrides
  };
}

// Helper to create mock DOM element with closest method
function createMockButton(id: string): HTMLButtonElement {
  const button = document.createElement("button");
  button.id = id;
  return button;
}

// Helper to create mock keyboard event
function createKeyboardEvent(key: string, options?: Partial<KeyboardEventInit>): KeyboardEvent {
  return new KeyboardEvent("keydown", { key, ...options });
}

// Helper to create mock mouse event
function createClickEvent(target: Element): MouseEvent {
  const event = new MouseEvent("click", { bubbles: true });
  Object.defineProperty(event, "target", { value: target, enumerable: true });
  return event;
}

// Helper to create mock change event
function createChangeEvent(target: HTMLElement): Event {
  const event = new Event("change", { bubbles: true });
  Object.defineProperty(event, "target", { value: target, enumerable: true });
  return event;
}

describe("Event Handlers", () => {
  describe("handleClickEvent", () => {
    it("invokes start handler when #start button is clicked", () => {
      const start = vi.fn();
      const handlers = {
        start,
        copyReplaySeed: vi.fn(),
        next: vi.fn(),
        resolve: vi.fn(),
        clearAndExit: vi.fn()
      };
      const state = createMockGameState();
      const button = createMockButton("start");
      const event = createClickEvent(button);

      handleClickEvent(event, state, handlers);

      expect(handlers.start).toHaveBeenCalled();
    });

    it("invokes start handler when #replay button is clicked", () => {
      const start = vi.fn();
      const handlers = {
        start,
        copyReplaySeed: vi.fn(),
        next: vi.fn(),
        resolve: vi.fn(),
        clearAndExit: vi.fn()
      };
      const state = createMockGameState();
      const button = createMockButton("replay");
      const event = createClickEvent(button);

      handleClickEvent(event, state, handlers);

      expect(handlers.start).toHaveBeenCalled();
    });

    it("invokes resolve handler when button with data-stat attribute is clicked", () => {
      const resolve = vi.fn<(stat: StatKey) => void>();
      const handlers = {
        start: vi.fn(),
        copyReplaySeed: vi.fn(),
        next: vi.fn(),
        resolve,
        clearAndExit: vi.fn()
      };
      const state = createMockGameState();
      const root = document.createElement("div");
      const button = createMockButton("stat-power");
      button.setAttribute("data-stat", "power");
      root.appendChild(button);
      root.addEventListener("click", (event) => handleClickEvent(event, state, handlers));

      button.click();

      expect(resolve).toHaveBeenCalledWith("power" satisfies StatKey);
    });

    it("invokes next handler when #next button is clicked and match exists", () => {
      const next = vi.fn();
      const handlers = {
        start: vi.fn(),
        copyReplaySeed: vi.fn(),
        next,
        resolve: vi.fn(),
        clearAndExit: vi.fn()
      };
      const activeMatch = createMockMatch();
      const state = createMockGameState({ match: activeMatch });
      const button = createMockButton("next");
      const event = createClickEvent(button);

      handleClickEvent(event, state, handlers);

      expect(handlers.next).toHaveBeenCalledWith(activeMatch);
    });

    it("does not invoke next handler when #next button is clicked without a match", () => {
      const next = vi.fn();
      const handlers = {
        start: vi.fn(),
        copyReplaySeed: vi.fn(),
        next,
        resolve: vi.fn(),
        clearAndExit: vi.fn()
      };
      const state = createMockGameState({ match: null });
      const button = createMockButton("next");
      const event = createClickEvent(button);

      handleClickEvent(event, state, handlers);

      expect(handlers.next).not.toHaveBeenCalled();
    });

    it("invokes clearAndExit handler when #quit button is clicked", () => {
      const clearAndExit = vi.fn();
      const handlers = {
        start: vi.fn(),
        copyReplaySeed: vi.fn(),
        next: vi.fn(),
        resolve: vi.fn(),
        clearAndExit
      };
      const state = createMockGameState();
      const button = createMockButton("quit");
      const event = createClickEvent(button);

      handleClickEvent(event, state, handlers);

      expect(handlers.clearAndExit).toHaveBeenCalled();
    });

    it("ignores disabled buttons", () => {
      const start = vi.fn();
      const handlers = {
        start,
        copyReplaySeed: vi.fn(),
        next: vi.fn(),
        resolve: vi.fn(),
        clearAndExit: vi.fn()
      };
      const state = createMockGameState();
      const button = createMockButton("start");
      button.disabled = true;
      const event = createClickEvent(button);

      handleClickEvent(event, state, handlers);

      expect(handlers.start).not.toHaveBeenCalled();
    });
  });

  describe("handleChangeEvent", () => {
    it("updates state.division when division radio changes to weight", () => {
      const state = createMockGameState({ division: "absolute" });
      const input = document.createElement("input");
      input.type = "radio";
      input.dataset.division = "weight";
      input.checked = true;
      const root = document.createElement("div");

      const handlers = {
        render: vi.fn(),
        persistPreferences: vi.fn(),
        setSoundEnabled: vi.fn()
      };

      handleChangeEvent(createChangeEvent(input), state, root, handlers);

      expect(state.division).toBe("weight");
      expect(handlers.persistPreferences).toHaveBeenCalled();
      expect(handlers.render).toHaveBeenCalled();
    });

    it("updates state.mode when mode radio changes to champion", () => {
      const state = createMockGameState({ mode: "classic" });
      const input = document.createElement("input");
      input.type = "radio";
      input.dataset.introMode = "champion";
      input.checked = true;
      const root = document.createElement("div");

      const handlers = {
        render: vi.fn(),
        persistPreferences: vi.fn(),
        setSoundEnabled: vi.fn()
      };

      handleChangeEvent(createChangeEvent(input), state, root, handlers);

      expect(state.mode).toBe("champion");
      expect(handlers.persistPreferences).toHaveBeenCalled();
      expect(handlers.render).toHaveBeenCalled();
    });

    it("updates state.replaySeed when replay-seed input changes", () => {
      const state = createMockGameState({ replaySeed: "" });
      const input = document.createElement("input");
      input.id = "replay-seed";
      input.value = "test-seed-123";
      const root = document.createElement("div");

      const handlers = {
        render: vi.fn(),
        persistPreferences: vi.fn(),
        setSoundEnabled: vi.fn()
      };

      handleChangeEvent(createChangeEvent(input), state, root, handlers);

      expect(state.replaySeed).toBe("test-seed-123");
    });

    it("invokes setSoundEnabled when sound-enabled checkbox is toggled", () => {
      const setSoundEnabled = vi.fn();
      const state = createMockGameState();
      const input = document.createElement("input");
      input.id = "sound-enabled";
      input.type = "checkbox";
      input.checked = true;
      const root = document.createElement("div");

      const handlers = {
        render: vi.fn(),
        persistPreferences: vi.fn(),
        setSoundEnabled
      };

      handleChangeEvent(createChangeEvent(input), state, root, handlers);

      expect(handlers.setSoundEnabled).toHaveBeenCalledWith(true);
    });
  });

  describe("handleToggleEvent", () => {
    it("updates accessibility labels on details element toggle", () => {
      const details = document.createElement("details");
      details.classList.add("advanced");
      const summary = document.createElement("summary");
      const state = document.createElement("span");
      state.classList.add("disclosure-state");

      details.appendChild(summary);
      details.appendChild(state);

      const event = new Event("toggle");
      Object.defineProperty(event, "target", { value: details, enumerable: true });

      details.open = true;
      handleToggleEvent(event);

      expect(summary.getAttribute("aria-label")).toBe("Hide advanced options");
      expect(state.textContent).toBe("Hide");
    });

    it("sets correct label when details element is closed", () => {
      const details = document.createElement("details");
      details.classList.add("advanced");
      const summary = document.createElement("summary");
      const state = document.createElement("span");
      state.classList.add("disclosure-state");

      details.appendChild(summary);
      details.appendChild(state);

      const event = new Event("toggle");
      Object.defineProperty(event, "target", { value: details, enumerable: true });

      details.open = false;
      handleToggleEvent(event);

      expect(summary.getAttribute("aria-label")).toBe("Show advanced options");
      expect(state.textContent).toBe("Show");
    });
  });

  describe("handleIntroKeyboard", () => {
    it("handles number key 1 to select 3-point match", () => {
      const choose = vi.fn();
      const handlers = {
        choose,
        start: vi.fn(),
        keyboardTick: vi.fn()
      };
      const state = createMockGameState({ lengthIndex: 0 });
      const root = document.createElement("div");
      const event = createKeyboardEvent("1");

      handleIntroKeyboard(event, state, root, handlers);

      expect(handlers.choose).toHaveBeenCalledWith(3);
    });

    it("handles number key 2 to select 5-point match", () => {
      const choose = vi.fn();
      const handlers = {
        choose,
        start: vi.fn(),
        keyboardTick: vi.fn()
      };
      const state = createMockGameState();
      const root = document.createElement("div");
      const event = createKeyboardEvent("2");

      handleIntroKeyboard(event, state, root, handlers);

      expect(handlers.choose).toHaveBeenCalledWith(5);
    });

    it("handles number key 3 to select 10-point match", () => {
      const choose = vi.fn();
      const handlers = {
        choose,
        start: vi.fn(),
        keyboardTick: vi.fn()
      };
      const state = createMockGameState();
      const root = document.createElement("div");
      const event = createKeyboardEvent("3");

      handleIntroKeyboard(event, state, root, handlers);

      expect(handlers.choose).toHaveBeenCalledWith(10);
    });

    it.each([
      ["ArrowLeft", 1, 3],
      ["ArrowRight", 0, 5]
    ])("handles %s navigation from length index %i", (key, lengthIndex, expectedLength) => {
      const choose = vi.fn();
      const handlers = {
        choose,
        start: vi.fn(),
        keyboardTick: vi.fn()
      };
      const state = createMockGameState({ lengthIndex });
      const root = document.createElement("div");
      const event = createKeyboardEvent(key);

      handleIntroKeyboard(event, state, root, handlers);

      expect(handlers.choose).toHaveBeenCalledWith(expectedLength);
    });

    it.each([
      ["ArrowLeft", 0, 10],
      ["ArrowRight", 2, 3]
    ])("wraps %s navigation from length index %i", (key, lengthIndex, expectedLength) => {
      const choose = vi.fn();
      const handlers = {
        choose,
        start: vi.fn(),
        keyboardTick: vi.fn()
      };
      const state = createMockGameState({ lengthIndex });
      const root = document.createElement("div");
      const event = createKeyboardEvent(key);

      handleIntroKeyboard(event, state, root, handlers);

      expect(handlers.choose).toHaveBeenCalledWith(expectedLength);
    });

    it("handles Enter key to start match", () => {
      const start = vi.fn();
      const handlers = {
        choose: vi.fn(),
        start,
        keyboardTick: vi.fn()
      };
      const state = createMockGameState();
      const root = document.createElement("div");
      const event = createKeyboardEvent("Enter");

      handleIntroKeyboard(event, state, root, handlers);

      expect(handlers.start).toHaveBeenCalled();
    });
  });

  describe("handleMatchKeyboard", () => {
    it("returns early if no match exists", () => {
      const resolve = vi.fn();
      const handlers = {
        resolve,
        keyboardTick: vi.fn()
      };
      const state = createMockGameState({ match: null });
      const root = document.createElement("div");
      const event = createKeyboardEvent("1");

      handleMatchKeyboard(event, state, root, handlers);

      expect(handlers.resolve).not.toHaveBeenCalled();
    });

    it.each<[string, StatKey]>([
      ["1", "power"],
      ["2", "speed"],
      ["3", "technique"],
      ["4", "kumikata"],
      ["5", "newaza"]
    ])("maps number key %s to %s during selecting phase", (key, stat) => {
      const resolve = vi.fn<(selectedStat: StatKey) => void>();
      const handlers = {
        resolve,
        keyboardTick: vi.fn()
      };
      const state = createMockGameState({
        match: createMockMatch({ phase: "selecting" })
      });
      const root = document.createElement("div");
      root.addEventListener("keydown", (event) => handleMatchKeyboard(event, state, root, handlers));

      root.dispatchEvent(createKeyboardEvent(key, { bubbles: true }));

      expect(resolve).toHaveBeenCalledWith(stat);
    });

    it("ignores number keys during non-selecting phases", () => {
      const resolve = vi.fn();
      const handlers = {
        resolve,
        keyboardTick: vi.fn()
      };
      const state = createMockGameState({
        match: createMockMatch({ phase: "awaitingNext" })
      });
      const root = document.createElement("div");
      const event = createKeyboardEvent("1");

      handleMatchKeyboard(event, state, root, handlers);

      expect(handlers.resolve).not.toHaveBeenCalled();
    });

    it("handles Enter key during awaitingNext phase", () => {
      const state = createMockGameState({
        match: createMockMatch({ phase: "awaitingNext" })
      });
      const root = document.createElement("div");
      const button = document.createElement("button");
      button.id = "next";
      root.appendChild(button);

      const handlers = {
        resolve: vi.fn(),
        keyboardTick: vi.fn()
      };
      const event = createKeyboardEvent("Enter");
      const clickSpy = vi.spyOn(button, "click");

      handleMatchKeyboard(event, state, root, handlers);

      expect(clickSpy).toHaveBeenCalled();
    });

    it("handles Escape key to quit match", () => {
      const state = createMockGameState({
        match: createMockMatch()
      });
      const root = document.createElement("div");
      const button = document.createElement("button");
      button.id = "quit";
      root.appendChild(button);

      const handlers = {
        resolve: vi.fn(),
        keyboardTick: vi.fn()
      };
      const event = createKeyboardEvent("Escape");
      const clickSpy = vi.spyOn(button, "click");

      handleMatchKeyboard(event, state, root, handlers);

      expect(clickSpy).toHaveBeenCalled();
    });
  });
});
