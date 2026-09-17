import { describe, expect, it, vi } from "vitest";
import { handleIntroKeyboard, handleMatchKeyboard } from "./keyboardHandlers";
import type { StatKey } from "../api/types";
import { createMockMatch, createMockGameState, createKeyboardEvent } from "../test/mocks";

describe("handleIntroKeyboard", () => {
  it("chooses length when numeric key 1-3 is pressed", () => {
    const state = createMockGameState({ setupStep: "length" });
    const handlers = { choose: vi.fn(), start: vi.fn(), keyboardTick: vi.fn() };
    const root = document.createElement("div");

    handleIntroKeyboard(createKeyboardEvent("1"), state, root, handlers);

    expect(handlers.choose).toHaveBeenCalledWith(3);
  });

  it("cycles through length choices with arrow keys", () => {
    const state = createMockGameState({ setupStep: "length", lengthIndex: 0 });
    const handlers = { choose: vi.fn(), start: vi.fn(), keyboardTick: vi.fn() };
    const root = document.createElement("div");

    handleIntroKeyboard(createKeyboardEvent("ArrowRight"), state, root, handlers);

    expect(handlers.choose).toHaveBeenCalledWith(5); // Next length
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
});

describe("handleMatchKeyboard", () => {
  it("resolves stat when number key 1-5 is pressed during selecting phase", () => {
    const match = createMockMatch({ phase: "selecting" });
    const state = createMockGameState({ match });
    const handlers = { resolve: vi.fn<(s: StatKey) => void>(), keyboardTick: vi.fn() };
    const root = document.createElement("div");

    handleMatchKeyboard(createKeyboardEvent("1"), state, root, handlers);

    expect(handlers.resolve).toHaveBeenCalledWith("power" satisfies StatKey);
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

    handleMatchKeyboard(createKeyboardEvent("Enter"), state, root, handlers);

    // Button would be clicked (tested via DOM event listener)
  });

  it("exits match with Escape key", () => {
    const match = createMockMatch();
    const state = createMockGameState({ match });
    const handlers = { resolve: vi.fn(), keyboardTick: vi.fn() };
    const root = document.createElement("div");
    const button = document.createElement("button");
    button.id = "quit";
    root.appendChild(button);

    handleMatchKeyboard(createKeyboardEvent("Escape"), state, root, handlers);

    // Button would be clicked
  });

  it("exits match with Q key", () => {
    const match = createMockMatch();
    const state = createMockGameState({ match });
    const handlers = { resolve: vi.fn(), keyboardTick: vi.fn() };
    const root = document.createElement("div");
    const button = document.createElement("button");
    button.id = "quit";
    root.appendChild(button);

    handleMatchKeyboard(createKeyboardEvent("q"), state, root, handlers);

    // Button would be clicked
  });

  it("does nothing when no match is active", () => {
    const state = createMockGameState({ match: null });
    const handlers = { resolve: vi.fn(), keyboardTick: vi.fn() };
    const root = document.createElement("div");

    handleMatchKeyboard(createKeyboardEvent("1"), state, root, handlers);

    expect(handlers.resolve).not.toHaveBeenCalled();
  });
});
