import { describe, expect, it } from "vitest";
import { createMockGameState, createMockMatch, createMockMatchResult } from "../test/mocks";
import { renderApp } from "./render";

describe("renderApp", () => {
  it("provides a level-one heading while a match is active", () => {
    const root = document.createElement("div");
    const state = createMockGameState({ match: createMockMatch({ matchNumber: 4 }) });

    renderApp(root, state);

    expect(root.querySelector("#game-title")?.tagName).toBe("H1");
    expect(root.querySelector("#game-title")?.textContent).toBe("Round 4 match");
  });

  it("shows optional tactical service failures without hiding the completed match summary", () => {
    const root = document.createElement("div");
    const state = createMockGameState({
      match: createMockMatch({ phase: "matchOver", winner: "player", scores: { player: 3, opponent: 1 } }),
      result: { ...createMockMatchResult(), match: createMockMatch({ phase: "matchOver", winner: "player", scores: { player: 3, opponent: 1 } }) },
      errorMessage: "The tactical insight service rejected its API key. Your match summary is still available."
    });

    renderApp(root, state);

    expect(root.querySelector("#status")?.textContent).toContain("The tactical insight service rejected its API key.");
    expect(root.querySelector('[aria-label="Match summary"]')).not.toBeNull();
  });
});
