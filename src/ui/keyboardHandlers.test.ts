import { describe, expect, it, vi } from "vitest";
import { handleIntroKeyboard, handleMatchKeyboard } from "./keyboardHandlers";
import type { StatKey } from "../api/types";
import { createMockMatch, createMockGameState, createKeyboardEvent } from "../test/mocks";

describe("handleIntroKeyboard", () => {
  it.each([
    ["1", 3],
    ["2", 5],
    ["3", 10]
  ])("[REQ-KEYBOARD-008] maps length shortcut %s to first-to-%i", (key, target) => {
    const state = createMockGameState({ setupStep: "length" });
    const handlers = { choose: vi.fn(), start: vi.fn(), keyboardTick: vi.fn() };

    handleIntroKeyboard(createKeyboardEvent(key), state, document.createElement("div"), handlers);

    expect(handlers.choose).toHaveBeenCalledWith(target);
  });

  it.each([
    ["ArrowLeft", 0, 10],
    ["ArrowRight", 0, 5],
    ["ArrowLeft", 1, 3],
    ["ArrowRight", 2, 3]
  ])("[REQ-KEYBOARD-008] moves length selection with %s from index %i to its configured value", (key, lengthIndex, target) => {
    const state = createMockGameState({ setupStep: "length", lengthIndex });
    const handlers = { choose: vi.fn(), start: vi.fn(), keyboardTick: vi.fn() };

    handleIntroKeyboard(createKeyboardEvent(key), state, document.createElement("div"), handlers);

    expect(handlers.choose).toHaveBeenCalledWith(target);
  });

  describe("cursor-based step handlers (mode/division)", () => {
    it.each([
      {
        step: "mode" as const,
        dataAttr: "data-intro-mode",
        selector: "[data-intro-mode]",
        shortcutKey: "c",
        expectedValue: "classic"
      },
      {
        step: "division" as const,
        dataAttr: "data-division",
        selector: "[data-division]",
        shortcutKey: "a",
        expectedValue: "absolute"
      }
    ])(
      "handles arrow keys for $step selection",
      ({ step }) => {
        const state = createMockGameState({ setupStep: step, setupCursor: 0 });
        const handlers = { choose: vi.fn(), start: vi.fn(), keyboardTick: vi.fn(), moveCursor: vi.fn() };
        const root = document.createElement("div");

        handleIntroKeyboard(createKeyboardEvent("ArrowDown"), state, root, handlers);

        expect(handlers.moveCursor).toHaveBeenCalledWith(1);
      }
    );

    it.each([
      {
        step: "mode" as const,
        dataAttr: "data-intro-mode",
        selector: "[data-intro-mode]",
        shortcutKey: "c",
        expectedValue: "classic"
      },
      {
        step: "division" as const,
        dataAttr: "data-division",
        selector: "[data-division]",
        shortcutKey: "a",
        expectedValue: "absolute"
      }
    ])(
      "handles keyboard shortcuts for $step selection",
      ({ step, dataAttr, expectedValue, shortcutKey }) => {
        const state = createMockGameState({ setupStep: step });
        const handlers = { choose: vi.fn(), start: vi.fn(), keyboardTick: vi.fn() };
        const root = document.createElement("div");
        const input = document.createElement("input");
        input.setAttribute(dataAttr, expectedValue);
        const clickSpy = vi.spyOn(input, "click");
        root.appendChild(input);

        handleIntroKeyboard(createKeyboardEvent(shortcutKey), state, root, handlers);

        expect(clickSpy).toHaveBeenCalled();
      }
    );
  });

  it("starts match when Enter is pressed at length screen", () => {
    const state = createMockGameState({ setupStep: "length", busy: false });
    const handlers = { choose: vi.fn(), start: vi.fn(), keyboardTick: vi.fn() };
    const root = document.createElement("div");

    handleIntroKeyboard(createKeyboardEvent("Enter"), state, root, handlers);

    expect(handlers.start).toHaveBeenCalled();
  });

  it("[REQ-KEYBOARD-008] does not start another match from Enter while a draw is in progress", () => {
    const handlers = { choose: vi.fn(), start: vi.fn(), keyboardTick: vi.fn() };
    const state = createMockGameState({ setupStep: "length", busy: true });

    handleIntroKeyboard(createKeyboardEvent("Enter"), state, document.createElement("div"), handlers);

    expect(handlers.start).not.toHaveBeenCalled();
  });
});

describe("handleMatchKeyboard", () => {
  it.each<[string, StatKey]>([
    ["1", "power"],
    ["2", "speed"],
    ["3", "technique"],
    ["4", "kumikata"],
    ["5", "newaza"]
  ])("[REQ-KEYBOARD-008] maps stat shortcut %s to %s during selection", (key, stat) => {
    const state = createMockGameState({ match: createMockMatch({ phase: "selecting" }) });
    const handlers = { resolve: vi.fn<(selectedStat: StatKey) => void>(), keyboardTick: vi.fn() };

    handleMatchKeyboard(createKeyboardEvent(key), state, document.createElement("div"), handlers);

    expect(handlers.resolve).toHaveBeenCalledWith(stat);
  });

  it("ignores stat keys when not in selecting phase", () => {
    const match = createMockMatch({ phase: "awaitingNext" });
    const state = createMockGameState({ match });
    const handlers = { resolve: vi.fn(), keyboardTick: vi.fn() };
    const root = document.createElement("div");

    handleMatchKeyboard(createKeyboardEvent("1"), state, root, handlers);

    expect(handlers.resolve).not.toHaveBeenCalled();
  });

  it("clicks next button when Enter is pressed during awaitingNext phase", () => {
    const match = createMockMatch({ phase: "awaitingNext" });
    const state = createMockGameState({ match, busy: false });
    const handlers = { resolve: vi.fn(), keyboardTick: vi.fn() };
    const root = document.createElement("div");
    const button = document.createElement("button");
    button.id = "next";
    root.appendChild(button);
    const click = vi.spyOn(button, "click");
    const event = createKeyboardEvent("Enter", { cancelable: true });

    handleMatchKeyboard(event, state, root, handlers);

    expect(click).toHaveBeenCalledOnce();
    expect(event.defaultPrevented).toBe(true);
  });

  it("[REQ-KEYBOARD-008] does not advance to the next round while a draw is in progress", () => {
    const state = createMockGameState({ busy: true, match: createMockMatch({ phase: "awaitingNext" }) });
    const root = document.createElement("div");
    const button = document.createElement("button");
    button.id = "next";
    root.appendChild(button);
    const click = vi.spyOn(button, "click");

    handleMatchKeyboard(createKeyboardEvent("Enter"), state, root, {
      resolve: vi.fn(),
      keyboardTick: vi.fn()
    });

    expect(click).not.toHaveBeenCalled();
  });

  it.each(["Escape", "q", "Q"])("[REQ-GAME-007] quits the match when %s is pressed", (key) => {
    const state = createMockGameState({ match: createMockMatch() });
    const root = document.createElement("div");
    const button = document.createElement("button");
    button.id = "quit";
    root.appendChild(button);
    const click = vi.spyOn(button, "click");

    handleMatchKeyboard(createKeyboardEvent(key), state, root, {
      resolve: vi.fn(),
      keyboardTick: vi.fn()
    });

    expect(click).toHaveBeenCalledOnce();
  });

  it("does nothing when no match is active", () => {
    const state = createMockGameState({ match: null });
    const handlers = { resolve: vi.fn(), keyboardTick: vi.fn() };
    const root = document.createElement("div");

    handleMatchKeyboard(createKeyboardEvent("1"), state, root, handlers);

    expect(handlers.resolve).not.toHaveBeenCalled();
  });
});
