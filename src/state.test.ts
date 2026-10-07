import { describe, expect, it, beforeEach, afterEach } from "vitest";
import {
  createGameState,
  persistPreferences,
  clearSavedMatch,
  saveGameState,
  loadSavedGameState
} from "./state";
import type { GameState } from "./state";
import { createMockJudoka, createMockMatch, createMockMatchResult } from "./test/mocks";

// jsdom provides localStorage and sessionStorage automatically

describe("State Management", () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  describe("createGameState", () => {
    it("creates initial state with default values when no preferences are saved", () => {
      const state = createGameState();
      expect(state).toEqual({
        match: null,
        result: null,
        tacticalAssessment: null,
        pendingStat: null,
        activeSeed: "",
        activeWeight: undefined,
        drawBuffer: [],
        target: 3,
        lengthIndex: 0,
        busy: false,
        errorMessage: "",
        history: [],
        division: "absolute",
        mode: "classic",
        weight: "random",
        replaySeed: "",
        seedMessage: "",
        setupStep: "mode",
        setupCursor: 0,
        seedModalOpen: false,
        seedDraft: ""
      });
    });

    it("loads persisted division preference from localStorage", () => {
      localStorage.setItem("judokon.divisionMode", "weight");
      const state = createGameState();
      expect(state.division).toBe("weight");
    });

    it("loads persisted game mode preference from localStorage", () => {
      localStorage.setItem("judokon.gameMode", "champion");
      const state = createGameState();
      expect(state).toMatchObject({ mode: "champion", setupCursor: 1 });
    });

    it("loads persisted weight class preference from localStorage", () => {
      localStorage.setItem("judokon.weightClass", "-73");
      const state = createGameState();
      expect(state.weight).toBe("-73");
    });

    it("loads all preferences together", () => {
      localStorage.setItem("judokon.divisionMode", "weight");
      localStorage.setItem("judokon.gameMode", "champion");
      localStorage.setItem("judokon.weightClass", "-81");
      const state = createGameState();
      expect(state).toMatchObject({
        division: "weight",
        mode: "champion",
        weight: "-81"
      });
    });
  });

  describe("persistPreferences", () => {
    it("saves division preference to localStorage", () => {
      const state = createGameState();
      state.division = "weight";
      persistPreferences(state);
      expect(localStorage.getItem("judokon.divisionMode")).toBe("weight");
    });

    it("saves game mode preference to localStorage", () => {
      const state = createGameState();
      state.mode = "champion";
      persistPreferences(state);
      expect(localStorage.getItem("judokon.gameMode")).toBe("champion");
    });

    it("saves weight class preference to localStorage", () => {
      const state = createGameState();
      state.weight = "-66";
      persistPreferences(state);
      expect(localStorage.getItem("judokon.weightClass")).toBe("-66");
    });

    it("performs round-trip preference save and load", () => {
      const originalState = createGameState();
      originalState.division = "weight";
      originalState.mode = "champion";
      originalState.weight = "-78";

      persistPreferences(originalState);

      const newState = createGameState();
      expect(newState).toMatchObject({
        division: "weight",
        mode: "champion",
        weight: "-78"
      });
    });
  });

  describe("clearSavedMatch", () => {
    it("removes saved match from sessionStorage", () => {
      sessionStorage.setItem("judokon.activeMatch.v1", "test-data");
      expect(sessionStorage.getItem("judokon.activeMatch.v1")).toBe("test-data");

      clearSavedMatch();

      expect(sessionStorage.getItem("judokon.activeMatch.v1")).toBeNull();
    });

  });

  describe("saveGameState", () => {
    it.each([
      { scenario: "before the first round", hasResult: false, history: [] },
      {
        scenario: "after a resolved round",
        hasResult: true,
        history: [{ outcome: "player", stat: "power", roundNumber: 1 }]
      }
    ])("[REQ-GAME-010] restores an active match $scenario", ({ hasResult, history }) => {
      const match = createMockMatch({
        phase: hasResult ? "awaitingNext" : "selecting",
        player: createMockJudoka("player", {
          stats: { power: 8, speed: 5, technique: 5, kumikata: 5, newaza: 5 }
        }),
        opponent: createMockJudoka("opponent")
      });
      const result = hasResult
        ? { ...createMockMatchResult(), match, playerValue: 8, opponentValue: 5 }
        : null;
      const state = createGameState();
      state.match = match;
      state.result = result;
      state.history = history as GameState["history"];
      state.activeSeed = "replay-seed";
      state.activeWeight = "-73";
      state.drawBuffer = Array.from({ length: 4 }, (_, index) => createMockJudoka(`buffer-${index}`));

      saveGameState(state);

      expect(loadSavedGameState()).toStrictEqual({
        match,
        result,
        history,
        activeSeed: "replay-seed",
        activeWeight: "-73",
        drawBuffer: state.drawBuffer
      });
    });

    it("does not save when match is null", () => {
      const state = createGameState();
      state.match = null;

      saveGameState(state);

      expect(sessionStorage.getItem("judokon.activeMatch.v1")).toBeNull();
    });

    it("[REQ-GAME-010] does not save an in-progress stat selection", () => {
      const state = createGameState();
      state.match = createMockMatch();
      state.pendingStat = "power";

      saveGameState(state);

      expect(sessionStorage.getItem("judokon.activeMatch.v1")).toBeNull();
    });

    it("[REQ-GAME-010] does not persist optional tactical assessment with replay state", () => {
      const state = createGameState();
      state.match = createMockMatch();
      state.tacticalAssessment = { overReliance: true };

      saveGameState(state);

      const saved = sessionStorage.getItem("judokon.activeMatch.v1");
      expect(saved).not.toBeNull();
      expect(saved).not.toContain("tacticalAssessment");
      expect(loadSavedGameState()).not.toHaveProperty("tacticalAssessment");
    });
  });

  describe("loadSavedGameState", () => {
    it("returns null when no saved match exists", () => {
      const loaded = loadSavedGameState();
      expect(loaded).toBeNull();
    });

    it("returns null when saved data is invalid JSON", () => {
      sessionStorage.setItem("judokon.activeMatch.v1", "invalid-json-{");
      const loaded = loadSavedGameState();
      expect(loaded).toBeNull();
    });

    it("returns null when saved data is missing required fields", () => {
      sessionStorage.setItem("judokon.activeMatch.v1", JSON.stringify({ version: 1 }));
      const loaded = loadSavedGameState();
      expect(loaded).toBeNull();
    });

    it("[REQ-GAME-010] restores a valid saved setup state with no active match", () => {
      const saved = {
        version: 1,
        match: null,
        result: null,
        history: [],
        activeSeed: "seed",
        activeWeight: undefined,
        drawBuffer: []
      };
      sessionStorage.setItem("judokon.activeMatch.v1", JSON.stringify(saved));
      expect(loadSavedGameState()).toStrictEqual({
        match: null,
        result: null,
        history: [],
        activeSeed: "seed",
        activeWeight: undefined,
        drawBuffer: []
      });
    });
  });

  describe("Edge cases and error handling", () => {
    it("handles very long seeds", () => {
      const state = createGameState();
      state.match = createMockMatch();
      const longSeed = "x".repeat(10000);
      state.activeSeed = longSeed;

      saveGameState(state);
      const loaded = loadSavedGameState();

      expect(loaded?.activeSeed).toBe(longSeed);
    });

    it("[REQ-GAME-010] restores fighter names exactly after saving a match", () => {
      const state = createGameState();
      const judoka = createMockJudoka("special");
      judoka.firstname = "Test \"Quote\" & <Tag>";
      judoka.surname = "O'Brien";
      state.match = { ...createMockMatch(), player: judoka };

      saveGameState(state);
      const loaded = loadSavedGameState();

      expect(loaded?.match?.player).toMatchObject({
        firstname: 'Test "Quote" & <Tag>',
        surname: "O'Brien"
      });
    });
  });
});
