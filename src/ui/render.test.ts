import { describe, expect, it } from "vitest";
import { createMockGameState, createMockMatch } from "../test/mocks";
import { renderApp } from "./render";

describe("renderApp", () => {
  it("provides a level-one heading while a match is active", () => {
    const root = document.createElement("div");
    const state = createMockGameState({ match: createMockMatch({ matchNumber: 4 }) });

    renderApp(root, state);

    expect(root.querySelector("#game-title")?.tagName).toBe("H1");
    expect(root.querySelector("#game-title")?.textContent).toBe("Round 4 match");
  });
});
