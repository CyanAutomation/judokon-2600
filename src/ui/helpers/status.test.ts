import { describe, expect, it } from "vitest";
import { createMockGameState, createMockMatch, createMockMatchResult } from "../../test/mocks";
import { status } from "./status";

describe("status", () => {
  it("[REQ-UI-009] prioritizes draw progress over stale errors and round state", () => {
    const state = createMockGameState({
      busy: true,
      errorMessage: "Previous draw failed",
      match: createMockMatch(),
      pendingStat: "power"
    });

    expect(status(state)).toBe(">> Putting your matchup together…");
  });

  it("[REQ-UI-009] reports draw errors as plain text", () => {
    const state = createMockGameState({ errorMessage: '<img src="x" onerror="alert(1)">' });

    expect(status(state)).toBe(">> <img src=\"x\" onerror=\"alert(1)\">");
  });

  it("[REQ-UI-009] prompts for setup when no match is active", () => {
    expect(status(createMockGameState({ match: null })))
      .toBe(">> Choose a game mode to start.");
  });

  it("[REQ-UI-009] keeps the opponent reveal playful and clear", () => {
    const state = createMockGameState({ match: createMockMatch(), pendingStat: "power" });

    expect(status(state)).toBe(">> Your opponent is sizing you up…");
  });

  it("[REQ-UI-009] prompts for a stat while a round is selecting", () => {
    const state = createMockGameState({ match: createMockMatch({ phase: "selecting" }) });

    expect(status(state)).toBe(">> Pick one of your stats.");
  });

  it.each([
    ["player", ">> The match is yours!"],
    ["opponent", ">> Your opponent takes the match."],
    ["draw", ">> It’s a draw!"]
  ] as const)("[REQ-UI-009] reports a completed match when the winner is %s", (winner, expected) => {
    const state = createMockGameState({ match: createMockMatch({ phase: "matchOver", winner }) });

    expect(status(state)).toBe(expected);
  });

  it("[REQ-UI-009] summarizes a resolved round with its selected stat and compared values", () => {
    const state = createMockGameState({
      match: createMockMatch({ phase: "awaitingNext" }),
      result: createMockMatchResult()
    });

    expect(status(state)).toBe(">> You take the point: Power 8–5.");
  });
});
