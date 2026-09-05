import { describe, expect, it, beforeEach, afterEach } from "vitest";
import {
  createGameState,
  persistPreferences,
  clearSavedMatch,
  saveGameState,
  loadSavedGameState
} from "./state";
import type { Match, MatchResult } from "./game/game";
import type { Judoka } from "./api/types";

// jsdom provides localStorage and sessionStorage automatically

// Helper to create mock judoka for testing
function createMockJudoka(id: string): Judoka {
  return {
    id,
    slug: id,
    firstname: "Test",
    surname: "Fighter",
    country: "Japan",
    countryCode: "JP",
    weightClass: "-73",
    stats: { power: 5, speed: 5, technique: 5, kumikata: 5, newaza: 5 }
  };
}

// Helper to create mock match for testing
function createMockMatch(): Match {
  return {
    player: createMockJudoka("player"),
    opponent: createMockJudoka("opponent"),
    phase: "selecting",
    scores: { player: 0, opponent: 0 },
    target: 3,
    matchNumber: 1,
    mode: "classic",
    winner: null
  };
}

// Helper to create mock match result
function createMockMatchResult(): MatchResult {
  return {
    match: createMockMatch(),
    outcome: "player",
    stat: "power",
    playerValue: 8,
    opponentValue: 5
  };
}

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
        seedMessage: ""
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
      expect(state.mode).toBe("champion");
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

    it("does not throw error if no saved match exists", () => {
      expect(() => clearSavedMatch()).not.toThrow();
    });
  });

  describe("saveGameState", () => {
    it("saves game state to sessionStorage when match exists", () => {
      const state = createGameState();
      state.match = createMockMatch();
      state.result = createMockMatchResult();
      state.history = [
        { outcome: "player", stat: "power", roundNumber: 1 }
      ];
      state.activeSeed = "test-seed";
      state.drawBuffer = [createMockJudoka("buffer-1")];

      saveGameState(state);

      expect(sessionStorage.getItem("judokon.activeMatch.v1")).not.toBeNull();
    });

    it("does not save when match is null", () => {
      const state = createGameState();
      state.match = null;

      saveGameState(state);

      expect(sessionStorage.getItem("judokon.activeMatch.v1")).toBeNull();
    });

    it("does not save when pendingStat is set (match in progress)", () => {
      const state = createGameState();
      state.match = createMockMatch();
      state.pendingStat = "power";

      saveGameState(state);

      expect(sessionStorage.getItem("judokon.activeMatch.v1")).toBeNull();
    });

    it("saves match with empty history", () => {
      const state = createGameState();
      state.match = createMockMatch();
      state.history = [];

      saveGameState(state);

      expect(sessionStorage.getItem("judokon.activeMatch.v1")).not.toBeNull();
    });

    it("saves match with completed result", () => {
      const state = createGameState();
      state.match = createMockMatch();
      state.result = createMockMatchResult();
      state.history = [
        { outcome: "player", stat: "power", roundNumber: 1 },
        { outcome: "opponent", stat: "technique", roundNumber: 2 }
      ];

      saveGameState(state);

      expect(sessionStorage.getItem("judokon.activeMatch.v1")).not.toBeNull();
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

    it("loads saved game state with complete data", () => {
      // Create and save a state
      const state = createGameState();
      state.match = createMockMatch();
      state.result = createMockMatchResult();
      state.history = [
        { outcome: "player", stat: "power", roundNumber: 1 }
      ];
      state.activeSeed = "test-seed-123";
      state.activeWeight = "-73";
      state.drawBuffer = [createMockJudoka("buffer-1"), createMockJudoka("buffer-2")];

      saveGameState(state);

      // Load and verify
      const loaded = loadSavedGameState();
      expect(loaded).not.toBeNull();
      expect(loaded?.match).toBeDefined();
      expect(loaded?.result).toBeDefined();
      expect(loaded?.activeSeed).toBe("test-seed-123");
      expect(loaded?.activeWeight).toBe("-73");
      expect(loaded?.drawBuffer).toHaveLength(2);
    });

    it("returns partial state with null match when match not saved", () => {
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
      const loaded = loadSavedGameState();
      expect(loaded?.match).toBeNull();
    });

    it("performs round-trip save and load with match data", () => {
      // Setup initial state
      const originalState = createGameState();
      originalState.match = createMockMatch();
      originalState.activeSeed = "round-trip-seed";
      originalState.history = [
        { outcome: "player", stat: "power", roundNumber: 1 },
        { outcome: "draw", stat: "speed", roundNumber: 2 }
      ];

      // Save
      saveGameState(originalState);

      // Load
      const loaded = loadSavedGameState();

      // Verify
      expect(loaded?.activeSeed).toBe("round-trip-seed");
      expect(loaded?.history).toHaveLength(2);
      expect(loaded?.history?.[0]).toEqual({ outcome: "player", stat: "power", roundNumber: 1 });
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

    it("handles large draw buffers", () => {
      const state = createGameState();
      state.match = createMockMatch();
      state.drawBuffer = Array.from({ length: 50 }, (_, i) => createMockJudoka(`buffer-${i}`));

      saveGameState(state);
      const loaded = loadSavedGameState();

      expect(loaded?.drawBuffer).toHaveLength(50);
    });

    it("handles special characters in fighter names during serialization", () => {
      const state = createGameState();
      const judoka = createMockJudoka("special");
      judoka.firstname = "Test \"Quote\" & <Tag>";
      judoka.surname = "O'Brien";
      state.match = { ...createMockMatch(), player: judoka };

      saveGameState(state);
      const loaded = loadSavedGameState();

      expect(loaded?.match?.player.firstname).toContain("Quote");
    });
  });
});
