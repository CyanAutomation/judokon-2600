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

    expect(status(state)).toBe(">> Drawing judoka…");
  });

  it("[REQ-UI-009] reports draw errors as plain text", () => {
    const state = createMockGameState({ errorMessage: '<img src="x" onerror="alert(1)">' });

    expect(status(state)).toBe(">> <img src=\"x\" onerror=\"alert(1)\">");
  });

  it("[REQ-UI-009] prompts for setup when no match is active", () => {
    expect(status(createMockGameState({ match: null })))
      .toBe(">> Configure a division and select a match length.");
  });

  it("[REQ-UI-009] explains when the opponent is committing a stat", () => {
    const state = createMockGameState({ match: createMockMatch(), pendingStat: "power" });

    expect(status(state)).toBe(">> Opponent commits…");
  });

  it("[REQ-UI-009] prompts for a stat while a round is selecting", () => {
    const state = createMockGameState({ match: createMockMatch({ phase: "selecting" }) });

    expect(status(state)).toBe(">> Choose your stat:");
  });

  it.each([
    ["player", ">> You win the match!"],
    ["opponent", ">> Opponent wins the match."],
    ["draw", ">> Match drawn."]
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
