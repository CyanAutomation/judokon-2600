import { describe, expect, it, vi } from "vitest";
import { handleChangeEvent } from "./changeHandlers";
import type { GameState } from "../state";

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
    setupStep: "length",
    ...overrides
  };
}

// Helper to create mock change event
function createChangeEvent(target: HTMLElement): Event {
  const event = new Event("change", { bubbles: true });
  Object.defineProperty(event, "target", { value: target, enumerable: true });
  return event;
}

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
    expect(state.setupStep).toBe("division");
  });

  it("requires a weight choice after Weight class is selected", () => {
    const state = createMockGameState({ setupStep: "division" });
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

    expect(state.setupStep).toBe("weight");
  });

  it("updates weight class when weight-class input changes", () => {
    const state = createMockGameState({ weight: "random" });
    const input = document.createElement("input");
    input.id = "weight-class";
    input.value = "-73";
    const root = document.createElement("div");

    const handlers = {
      render: vi.fn(),
      persistPreferences: vi.fn(),
      setSoundEnabled: vi.fn()
    };

    handleChangeEvent(createChangeEvent(input), state, root, handlers);

    expect(state.weight).toBe("-73");
    expect(handlers.persistPreferences).toHaveBeenCalled();
    expect(handlers.render).toHaveBeenCalled();
  });

  it("updates sound enabled state in localStorage", () => {
    const state = createMockGameState();
    const input = document.createElement("input");
    input.type = "checkbox";
    input.id = "sound-enabled";
    input.checked = true;
    const root = document.createElement("div");

    const handlers = {
      render: vi.fn(),
      persistPreferences: vi.fn(),
      setSoundEnabled: vi.fn()
    };

    handleChangeEvent(createChangeEvent(input), state, root, handlers);

    expect(handlers.setSoundEnabled).toHaveBeenCalledWith(true);
  });
});
