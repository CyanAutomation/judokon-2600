import { describe, expect, it, vi } from "vitest";
import { handleClickEvent } from "./clickHandlers";
import type { StatKey } from "../api/types";
import { createMockMatch, createMockGameState, createMockButton, createClickEvent } from "../test/mocks";

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
