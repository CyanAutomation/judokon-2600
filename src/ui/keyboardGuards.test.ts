import { describe, expect, it } from "vitest";
import { isSeedModalEscape, shouldHandleKeyboardEvent, shouldPlayKeyboardTick } from "./keyboardGuards";
import { createMockGameState, createKeyboardEvent } from "../test/mocks";

describe("isSeedModalEscape", () => {
  it("returns false when the seed modal is closed", () => {
    const state = createMockGameState({ seedModalOpen: false });

    expect(isSeedModalEscape(createKeyboardEvent("Escape"), state)).toBe(false);
  });

  it("returns false for non-Escape keys while the seed modal is open", () => {
    const state = createMockGameState({ seedModalOpen: true });

    expect(isSeedModalEscape(createKeyboardEvent("Enter"), state)).toBe(false);
  });
});

describe("keyboard event guards", () => {
  it("lets editable controls handle their own keys but permits game choice inputs", () => {
    const textInput = document.createElement("input");
    const choiceInput = document.createElement("input");
    choiceInput.className = "choice-input";
    const textEvent = createKeyboardEvent("Enter");
    const choiceEvent = createKeyboardEvent("Enter");

    Object.defineProperty(textEvent, "target", { value: textInput });
    Object.defineProperty(choiceEvent, "target", { value: choiceInput });
    expect(shouldHandleKeyboardEvent(textEvent)).toBe(false);
    expect(shouldHandleKeyboardEvent(choiceEvent)).toBe(true);
  });

  it("leaves focused utility buttons and summaries to their native keyboard actions", () => {
    const button = document.createElement("button");
    const summary = document.createElement("summary");
    const buttonEvent = createKeyboardEvent("Enter");
    const summaryEvent = createKeyboardEvent("Enter");
    Object.defineProperty(buttonEvent, "target", { value: button });
    Object.defineProperty(summaryEvent, "target", { value: summary });

    expect(shouldHandleKeyboardEvent(buttonEvent)).toBe(false);
    expect(shouldHandleKeyboardEvent(summaryEvent)).toBe(false);
  });

  it.each([
    ["1", true],
    ["ArrowDown", true],
    ["Enter", true],
    ["z", false]
  ])("classifies %s as a %s keyboard tick", (key, expected) => {
    expect(shouldPlayKeyboardTick(key)).toBe(expected);
  });
});
