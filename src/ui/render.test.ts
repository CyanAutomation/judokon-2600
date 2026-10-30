import { describe, expect, it } from "vitest";
import { createMockGameState, createMockMatch, createMockMatchResult } from "../test/mocks";
import { renderApp } from "./render";

describe("renderApp", () => {
  it("[REQ-UI-008] shows the selected setup choices and target in the header", () => {
    const root = document.createElement("div");
    const state = createMockGameState({
      match: null,
      mode: "champion",
      division: "weight",
      weight: "-73",
      target: 5
    });

    renderApp(root, state);

    expect(root.querySelector("header p")?.textContent).toBe("Champion · -73 kg division · First to 5");
  });

  it("[REQ-UI-008] keeps static round context in the header without repeating the scoreboard", () => {
    const root = document.createElement("div");
    const state = createMockGameState({
      mode: "champion",
      match: createMockMatch({
        mode: "champion",
        matchNumber: 4,
        scores: { player: 2, opponent: 1 },
        target: 5
      })
    });

    renderApp(root, state);

    expect(root.querySelector(".header-context-wide")?.textContent)
      .toBe("Round 4 · Champion · Absolute");
    expect(root.querySelector(".header-context-compact")?.textContent)
      .toBe("Round 4 · Champion · Absolute");
    expect(root.querySelector(".scoreboard")?.textContent).toContain("2");
    expect(root.querySelector(".scoreboard")?.textContent).toContain("1");
  });

  it("[REQ-UI-009] shows draw progress on the setup screen", () => {
    const root = document.createElement("div");
    const state = createMockGameState({ match: null, busy: true });

    renderApp(root, state);

    expect(root.querySelector('[role="status"]')?.textContent).toContain("Putting your matchup together");
  });

  it("[REQ-UI-009] shows a setup draw error as text", () => {
    const root = document.createElement("div");
    const message = '<img src="x" onerror="alert(1)">';
    const state = createMockGameState({ match: null, errorMessage: message });

    renderApp(root, state);

    const status = root.querySelector<HTMLElement>('[role="status"]');
    expect(status?.textContent).toContain(message);
    expect(status?.querySelector("img")).toBeNull();
  });

  it("[REQ-UI-009] shows an active-match error as text", () => {
    const root = document.createElement("div");
    const message = '<img src="x" onerror="alert(1)">';
    const state = createMockGameState({
      match: createMockMatch(),
      errorMessage: message
    });

    renderApp(root, state);

    const status = root.querySelector<HTMLElement>("#status");
    expect(status?.textContent).toContain(message);
    expect(status?.querySelector("img")).toBeNull();
  });

  it("provides a level-one heading while a match is active", () => {
    const root = document.createElement("div");
    const state = createMockGameState({ match: createMockMatch({ matchNumber: 4 }) });

    renderApp(root, state);

    expect(root.querySelector("#game-title")?.tagName).toBe("H1");
    expect(root.querySelector("#game-title")?.textContent).toBe("Round 4 match");
  });

  it("keeps the repeated idle selection status available to assistive technology", () => {
    const root = document.createElement("div");
    const state = createMockGameState({ match: createMockMatch({ phase: "selecting" }) });

    renderApp(root, state);

    expect(root.querySelector("#status")?.classList.contains("visually-hidden")).toBe(true);
    expect(root.querySelector("#status")?.getAttribute("aria-live")).toBe("polite");
    expect(root.querySelector("#decision-heading")?.textContent).toBe("Choose a stat");
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
