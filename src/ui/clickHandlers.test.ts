import { describe, expect, it, vi } from "vitest";
import { handleClickEvent } from "./clickHandlers";
import { handleChangeEvent } from "./changeHandlers";
import type { StatKey } from "../api/types";
import { createMockMatch, createMockGameState, createMockButton, createClickEvent, createChangeEvent } from "../test/mocks";

describe("handleClickEvent", () => {
  it("opens the seed modal from the footer utility", () => {
    const openSeedModal = vi.fn();
    const handlers = {
      start: vi.fn(),
      copyReplaySeed: vi.fn(),
      next: vi.fn(),
      resolve: vi.fn(),
      clearAndExit: vi.fn(),
      openSeedModal
    };
    const button = createMockButton("seed-button");

    handleClickEvent(createClickEvent(button), createMockGameState(), handlers);

    expect(openSeedModal).toHaveBeenCalledOnce();
  });

  it("saves a seed from the dialog without relying on an inline footer field", () => {
    const saveReplaySeed = vi.fn();
    const handlers = {
      start: vi.fn(),
      copyReplaySeed: vi.fn(),
      next: vi.fn(),
      resolve: vi.fn(),
      clearAndExit: vi.fn(),
      saveReplaySeed
    };
    const dialog = document.createElement("div");
    dialog.className = "seed-dialog";
    const input = document.createElement("input");
    input.id = "replay-seed";
    input.value = "dojo-42";
    const button = createMockButton("save-seed");
    dialog.append(input, button);

    handleClickEvent(createClickEvent(button), createMockGameState(), handlers);

    expect(saveReplaySeed).toHaveBeenCalledWith("dojo-42");
  });

  it("confirms an already-selected mode choice when clicked", () => {
    const setSetupStep = vi.fn();
    const handlers = {
      start: vi.fn(),
      copyReplaySeed: vi.fn(),
      next: vi.fn(),
      resolve: vi.fn(),
      clearAndExit: vi.fn(),
      setSetupStep
    };
    const state = createMockGameState({ match: null, setupStep: "mode", mode: "classic" });
    const input = document.createElement("input");
    input.checked = true;
    input.dataset.introMode = "classic";

    handleClickEvent(createClickEvent(input), state, handlers);

    expect(setSetupStep).toHaveBeenCalledWith("division");
  });

  it("[REQ-UI-014] advances setup after the newly selected mode changes", () => {
    const state = createMockGameState({ match: null, setupStep: "mode", mode: "classic" });
    const input = document.createElement("input");
    input.type = "radio";
    input.checked = true;
    input.dataset.introMode = "champion";
    const root = document.createElement("div");
    root.append(input);
    root.addEventListener("click", (event) => handleClickEvent(event as MouseEvent, state, {
      start: vi.fn(),
      copyReplaySeed: async () => undefined,
      next: async () => undefined,
      resolve: vi.fn(),
      clearAndExit: vi.fn(),
      setSetupStep: (step) => { state.setupStep = step; }
    }));
    const changeHandlers = {
      render: vi.fn(),
      persistPreferences: vi.fn(),
      setSoundEnabled: vi.fn()
    };
    root.addEventListener("change", (event) => handleChangeEvent(event, state, root, changeHandlers));

    root.dispatchEvent(createClickEvent(input));
    expect(state.setupStep).toBe("mode");

    root.dispatchEvent(createChangeEvent(input));

    expect(state.mode).toBe("champion");
    expect(state.setupStep).toBe("division");
    expect(changeHandlers.persistPreferences).toHaveBeenCalledOnce();
    expect(changeHandlers.render).toHaveBeenCalledOnce();
  });

  it("confirms an already-selected division choice when clicked", () => {
    const setSetupStep = vi.fn();
    const handlers = {
      start: vi.fn(),
      copyReplaySeed: vi.fn(),
      next: vi.fn(),
      resolve: vi.fn(),
      clearAndExit: vi.fn(),
      setSetupStep
    };
    const state = createMockGameState({ match: null, setupStep: "division", division: "weight" });
    const input = document.createElement("input");
    input.checked = true;
    input.dataset.division = "weight";

    handleClickEvent(createClickEvent(input), state, handlers);

    expect(setSetupStep).toHaveBeenCalledWith("weight");
  });

  it("does not confirm the current setup choice while busy or after a match starts", () => {
    for (const stateOverride of [
      { busy: true },
      { match: createMockMatch() }
    ]) {
      const setSetupStep = vi.fn();
      const state = createMockGameState({
        match: null,
        setupStep: "mode",
        mode: "classic",
        ...stateOverride
      });
      const input = document.createElement("input");
      input.checked = true;
      input.dataset.introMode = "classic";

      handleClickEvent(createClickEvent(input), state, {
        start: vi.fn(),
        copyReplaySeed: vi.fn(),
        next: vi.fn(),
        resolve: vi.fn(),
        clearAndExit: vi.fn(),
        setSetupStep
      });

      expect(setSetupStep).not.toHaveBeenCalled();
    }
  });

  it("[REQ-UI-014] advances setup after the newly selected division changes", () => {
    const state = createMockGameState({ match: null, setupStep: "division", division: "absolute" });
    const input = document.createElement("input");
    input.type = "radio";
    input.checked = true;
    input.dataset.division = "weight";
    const root = document.createElement("div");
    root.append(input);
    root.addEventListener("click", (event) => handleClickEvent(event as MouseEvent, state, {
      start: vi.fn(),
      copyReplaySeed: async () => undefined,
      next: async () => undefined,
      resolve: vi.fn(),
      clearAndExit: vi.fn(),
      setSetupStep: (step) => { state.setupStep = step; }
    }));
    const changeHandlers = {
      render: vi.fn(),
      persistPreferences: vi.fn(),
      setSoundEnabled: vi.fn()
    };
    root.addEventListener("change", (event) => handleChangeEvent(event, state, root, changeHandlers));

    root.dispatchEvent(createClickEvent(input));
    expect(state.setupStep).toBe("division");

    root.dispatchEvent(createChangeEvent(input));

    expect(state.division).toBe("weight");
    expect(state.setupStep).toBe("weight");
    expect(changeHandlers.persistPreferences).toHaveBeenCalledOnce();
    expect(changeHandlers.render).toHaveBeenCalledOnce();
  });

  it("starts the match when a match-length choice is clicked", () => {
    const startWithLength = vi.fn();
    const handlers = {
      start: vi.fn(),
      copyReplaySeed: vi.fn(),
      next: vi.fn(),
      resolve: vi.fn(),
      clearAndExit: vi.fn(),
      startWithLength
    };
    const state = createMockGameState({ match: null, busy: false });
    const label = document.createElement("label");
    label.className = "choice-card";
    const input = document.createElement("input");
    input.type = "radio";
    input.dataset.length = "5";
    const child = document.createElement("span");
    label.append(input, child);
    const event = new MouseEvent("click", { bubbles: true, cancelable: true });
    Object.defineProperty(event, "target", { value: child });

    handleClickEvent(event, state, handlers);

    expect(startWithLength).toHaveBeenCalledOnce();
    expect(startWithLength).toHaveBeenCalledWith(5);
    expect(event.defaultPrevented).toBe(true);
  });

  it("ignores match-length clicks while a match is being drawn", () => {
    const startWithLength = vi.fn();
    const handlers = {
      start: vi.fn(),
      copyReplaySeed: vi.fn(),
      next: vi.fn(),
      resolve: vi.fn(),
      clearAndExit: vi.fn(),
      startWithLength
    };
    const state = createMockGameState({ match: null, busy: true });
    const label = document.createElement("label");
    label.className = "choice-card";
    const input = document.createElement("input");
    input.type = "radio";
    input.dataset.length = "10";
    label.append(input);
    const event = new MouseEvent("click", { bubbles: true, cancelable: true });
    Object.defineProperty(event, "target", { value: label });

    handleClickEvent(event, state, handlers);

    expect(startWithLength).not.toHaveBeenCalled();
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

  it("does not activate a disabled button through delegated click handling", () => {
    const start = vi.fn();
    const handlers = {
      start,
      copyReplaySeed: vi.fn(),
      next: vi.fn(),
      resolve: vi.fn(),
      clearAndExit: vi.fn()
    };
    const root = document.createElement("div");
    const button = createMockButton("start");
    button.disabled = true;
    root.appendChild(button);
    root.addEventListener("click", (event) => handleClickEvent(event, createMockGameState(), handlers));

    button.dispatchEvent(createClickEvent(button));

    expect(start).not.toHaveBeenCalled();
  });

});
