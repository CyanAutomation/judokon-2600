import { describe, expect, it } from "vitest";
import { isSeedModalEscape } from "./keyboardGuards";
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