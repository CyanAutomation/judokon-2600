import { describe, expect, it } from "vitest";
import { isSeedModalEscape, shouldHandleKeyboardEvent, shouldPlayKeyboardTick } from "./keyboardGuards";
import { createMockGameState, createKeyboardEvent } from "../test/mocks";

describe("isSeedModalEscape", () => {
  it("returns true when seed modal is open and Escape is pressed", () => {
    const state = createMockGameState({ seedModalOpen: true });

    expect(isSeedModalEscape(createKeyboardEvent("Escape"), state)).toBe(true);
  });

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

  it.each([
    ["1", true],
    ["ArrowDown", true],
    ["Enter", true],
    ["z", false]
  ])("classifies %s as a %s keyboard tick", (key, expected) => {
    expect(shouldPlayKeyboardTick(key)).toBe(expected);
  });
});
