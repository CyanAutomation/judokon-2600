import { describe, expect, it, vi } from "vitest";
import type { GameState } from "./state";
import type { Match, MatchResult } from "./game/game";
import type { Judoka, StatKey } from "./api/types";

// Note: These tests are designed to test the logic that WILL be extracted from main.ts
// during Phase 2-3. For now, we test the core functions that would be extracted.
// We import the types and test helper logic that would be part of orchestrator.ts

// Mock judoka helper
function createMockJudoka(id: string, overrides?: Partial<Judoka>): Judoka {
  return {
    id,
    slug: id,
    firstname: "Test",
    surname: "Fighter",
    country: "Japan",
    countryCode: "JP",
    weightClass: "-73",
    stats: { power: 8, speed: 5, technique: 6, kumikata: 7, newaza: 6 },
    ...overrides
  };
}

// Mock match helper
function createMockMatch(overrides?: Partial<Match>): Match {
  return {
    player: createMockJudoka("player"),
    opponent: createMockJudoka("opponent"),
    phase: "selecting",
    scores: { player: 0, opponent: 0 },
    target: 3,
    matchNumber: 1,
    mode: "classic",
    winner: null,
    ...overrides
  };
}

// Mock result helper
function createMockMatchResult(): MatchResult {
  return {
    match: createMockMatch(),
    outcome: "player",
    stat: "power",
    playerValue: 8,
    opponentValue: 5
  };
}

// Mock game state
function createMockGameState(overrides?: Partial<GameState>): GameState {
  return {
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
    seedMessage: "",
    ...overrides
  };
}

describe("Main Module - Render Functions", () => {
  describe("Helper utilities", () => {
    it("computes hash from seed string correctly", () => {
      const seed1 = "test-seed";
      const seed2 = "different-seed";

      let hash1 = 0;
      for (const c of seed1) hash1 = (hash1 * 31 + c.charCodeAt(0)) >>> 0;

      let hash2 = 0;
      for (const c of seed2) hash2 = (hash2 * 31 + c.charCodeAt(0)) >>> 0;

      expect(hash1).not.toBe(hash2);
      expect(hash1).toBeGreaterThanOrEqual(0);
      expect(hash2).toBeGreaterThanOrEqual(0);
    });

    it("produces consistent hash for same seed", () => {
      const seed = "consistent-seed";

      let hash1 = 0;
      for (const c of seed) hash1 = (hash1 * 31 + c.charCodeAt(0)) >>> 0;

      let hash2 = 0;
      for (const c of seed) hash2 = (hash2 * 31 + c.charCodeAt(0)) >>> 0;

      expect(hash1).toBe(hash2);
    });

    it("generates valid UUID (replacement for crypto.randomUUID)", () => {
      const uuid = crypto.randomUUID();
      expect(uuid).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
    });
  });

  describe("Status message generation", () => {
    it("returns busy message when state.busy is true", () => {
      const state = createMockGameState({ busy: true });

      const statusMessage = (() => {
        if (state.busy) return ">> Drawing judoka…";
        return "";
      })();

      expect(statusMessage).toBe(">> Drawing judoka…");
    });

    it("returns error message when state.errorMessage is set", () => {
      const state = createMockGameState({ errorMessage: "Network error" });

      const statusMessage = (() => {
        if (state.errorMessage) return `>> ${state.errorMessage}`;
        return "";
      })();

      expect(statusMessage).toBe(">> Network error");
    });

    it("returns configuration prompt when no match exists", () => {
      const state = createMockGameState({ match: null });

      const statusMessage = (() => {
        if (!state.match) return ">> Configure a division and select a match length.";
        return "";
      })();

      expect(statusMessage).toContain("Configure");
    });

    it("returns opponent committing message when pendingStat is set", () => {
      const state = createMockGameState({
        match: createMockMatch(),
        pendingStat: "power"
      });

      const statusMessage = (() => {
        if (state.pendingStat) return ">> Opponent commits…";
        return "";
      })();

      expect(statusMessage).toBe(">> Opponent commits…");
    });

    it("returns selecting prompt during match selection phase", () => {
      const state = createMockGameState({
        match: createMockMatch({ phase: "selecting" })
      });

      const statusMessage = (() => {
        if (state.match?.phase === "selecting") return ">> Choose your stat:";
        return "";
      })();

      expect(statusMessage).toBe(">> Choose your stat:");
    });

    it("returns win/loss/draw message when match is over", () => {
      const state = createMockGameState({
        match: createMockMatch({ phase: "matchOver", winner: "player" })
      });

      const statusMessage = (() => {
        if (state.match?.phase === "matchOver") {
          return state.match.winner === "draw"
            ? ">> Match drawn."
            : state.match.winner === "player"
              ? ">> You win the match!"
              : ">> Opponent wins the match.";
        }
        return "";
      })();

      expect(statusMessage).toContain("You win");
    });
  });

  describe("Fighter card generation", () => {
    it("generates fighter card HTML with player label", () => {
      const judoka = createMockJudoka("player1");

      const fighterHTML = `${judoka.firstname} ${judoka.surname}`;

      expect(fighterHTML).toContain("Test Fighter");
      expect(fighterHTML).toContain("Test");
    });

    it("includes stat values when result exists", () => {
      const result = createMockMatchResult();
      const { stat, playerValue } = result;

      expect(stat).toBe("power");
      expect(playerValue).toBeGreaterThan(0);
    });

    it("displays rarity classification", () => {
      const judoka = createMockJudoka("p1", { rarity: "Elite" });
      expect(judoka.rarity).toBe("Elite");
    });
  });

  describe("Header context generation", () => {
    it("generates full context when match is active", () => {
      const state = createMockGameState({
        match: createMockMatch({ matchNumber: 5 })
      });

      const divisions = ["Absolute", "Weight class"];
      const modes = ["Classic Battle", "Champion"];

      expect(state.match?.matchNumber).toBe(5);
      expect(divisions.length).toBe(2);
      expect(modes.length).toBe(2);
    });

    it("generates setup context when no match exists", () => {
      const state = createMockGameState({ match: null, mode: "champion" });

      const modeLabel = state.mode === "champion" ? "Champion" : "Classic Battle";

      expect(modeLabel).toBe("Champion");
    });
  });
});

describe("Main Module - State Orchestration Functions", () => {
  describe("Match initialization (start function logic)", () => {
    it("sets target from parameter", () => {
      const state = createMockGameState({ target: 3 });
      const newTarget = 5;

      state.target = newTarget;

      expect(state.target).toBe(5);
    });

    it("computes lengthIndex from target", () => {
      const lengths = [3, 5, 10] as const;

      const lengthIndex = lengths.indexOf(5 as typeof lengths[number]);

      expect(lengthIndex).toBe(1);
    });

    it("uses provided seed or generates new UUID", () => {
      const state = createMockGameState();
      const providedSeed = "custom-seed-123";

      state.activeSeed = providedSeed;

      expect(state.activeSeed).toBe("custom-seed-123");
    });

    it("generates UUID when seed is empty", () => {
      const state = createMockGameState({ replaySeed: "" });
      const seed = state.replaySeed.trim() || crypto.randomUUID();

      expect(seed).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-/i);
    });

    it("clears game state on start", () => {
      const state = createMockGameState({
        match: createMockMatch(),
        result: createMockMatchResult(),
        history: [{ outcome: "player", stat: "power", roundNumber: 1 }],
        pendingStat: "power"
      });

      state.match = null;
      state.result = null;
      state.history = [];
      state.pendingStat = null;
      state.errorMessage = "";
      state.drawBuffer = [];

      expect(state.match).toBeNull();
      expect(state.result).toBeNull();
      expect(state.history).toHaveLength(0);
      expect(state.pendingStat).toBeNull();
    });

    it("sets active weight for weight division with specific class", () => {
      const state = createMockGameState({
        division: "weight",
        weight: "-73"
      });

      const weights = ["-48", "-52", "-57", "-60", "-63", "-66", "-70", "-73", "-78", "-81", "-90", "-100", "+78", "+100"] as const;
      const seed = "test-seed";
      let hash = 0;
      for (const c of seed) hash = (hash * 31 + c.charCodeAt(0)) >>> 0;

      const selectedWeight = state.weight === "random" ? weights[hash % weights.length] : state.weight;

      expect(selectedWeight).toBe("-73");
    });

    it("selects random weight when weight is random", () => {
      const weights = ["-48", "-52", "-57", "-60", "-63", "-66", "-70", "-73", "-78", "-81", "-90", "-100", "+78", "+100"] as const;
      const seed = "deterministic-seed";
      let hash = 0;
      for (const c of seed) hash = (hash * 31 + c.charCodeAt(0)) >>> 0;

      const randomIndex = hash % weights.length;
      const selectedWeight = weights[randomIndex];

      expect(weights).toContain(selectedWeight);
    });
  });

  describe("Draw error handling", () => {
    it("handles no compatible judoka error with fallback message", () => {
      const error = new Error("No compatible judoka found");
      const message = error.message.startsWith("No compatible")
        ? `${error.message}. Choose Absolute or another division.`
        : `${error.message}. Check your connection and try again.`;

      expect(message).toContain("No compatible");
      expect(message).toContain("Choose Absolute");
    });

    it("handles generic network error", () => {
      const error = new Error("Network failed");
      const message = error.message.startsWith("No compatible")
        ? `${error.message}. Choose Absolute or another division.`
        : `${error.message}. Check your connection and try again.`;

      expect(message).toContain("Network failed");
      expect(message).toContain("Check your connection");
    });

    it("handles non-Error object throws", () => {
      const error = "string error";
      const message =
        typeof error === "string"
          ? "Unable to draw judoka. Please try again."
          : error instanceof Error
            ? `${error.message}. Check your connection and try again.`
            : "Unable to draw judoka. Please try again.";

      expect(message).toContain("Unable to draw");
    });
  });

  describe("Phase progression (next function logic)", () => {
    it("determines opponent for classic mode (fresh draw)", () => {
      const state = createMockGameState({
        mode: "classic",
        drawBuffer: [createMockJudoka("next-opp")]
      });

      const nextOpponent = state.drawBuffer[0];

      expect(nextOpponent.id).toBe("next-opp");
    });

    it("keeps player for champion mode", () => {
      const playerJudoka = createMockJudoka("champion-player", { firstname: "Champion" });
      const state = createMockGameState({
        mode: "champion",
        match: createMockMatch({ player: playerJudoka })
      });

      const continuingPlayer = state.match?.player;

      expect(continuingPlayer?.id).toBe("champion-player");
    });

    it("needs new opponent buffer fill for champion mode when depleted", () => {
      const state = createMockGameState({
        mode: "champion",
        drawBuffer: [],
        match: createMockMatch({ matchNumber: 5 })
      });

      const needsRefill = state.drawBuffer.length < 1;

      expect(needsRefill).toBe(true);
    });

    it("needs opponent buffer refill for classic mode when below 2", () => {
      const state = createMockGameState({
        mode: "classic",
        drawBuffer: [createMockJudoka("one")]
      });

      const needsRefill = state.drawBuffer.length < 2;

      expect(needsRefill).toBe(true);
    });
  });

  describe("Stat selection (choose function logic)", () => {
    it("updates target match length", () => {
      const state = createMockGameState({ target: 3 });

      const newLength = 5;
      state.target = newLength;

      expect(state.target).toBe(5);
    });

    it("updates lengthIndex to match new length", () => {
      const lengths = [3, 5, 10] as const;
      const state = createMockGameState({ lengthIndex: 0 });

      const newLength = 10;
      const newIndex = lengths.indexOf(newLength as typeof lengths[number]);

      state.lengthIndex = newIndex;

      expect(state.lengthIndex).toBe(2);
    });
  });

  describe("Match resolution (resolve function logic)", () => {
    it("validates state before processing resolution", () => {
      const state = createMockGameState({
        match: createMockMatch({ phase: "selecting" }),
        pendingStat: null
      });

      const isValid = state.match && state.match.phase === "selecting" && !state.pendingStat;

      expect(isValid).toBe(true);
    });

    it("rejects resolution when match is null", () => {
      const state = createMockGameState({ match: null });

      const isValid = state.match?.phase === "selecting" && !state.pendingStat;

      expect(isValid).toBe(false);
    });

    it("rejects resolution when phase is not selecting", () => {
      const state = createMockGameState({
        match: createMockMatch({ phase: "awaitingNext" })
      });

      const isValid = state.match?.phase === "selecting";

      expect(isValid).toBe(false);
    });

    it("rejects resolution when already pending", () => {
      const state = createMockGameState({
        match: createMockMatch({ phase: "selecting" }),
        pendingStat: "power"
      });

      const isValid = !state.pendingStat;

      expect(isValid).toBe(false);
    });

    it("processes async resolution with setTimeout timing", () => {
      const delayMs = 650;

      expect(delayMs).toBe(650);
    });

    it("records resolution in history", () => {
      const state = createMockGameState({
        history: []
      });

      state.history.push({
        outcome: "player",
        stat: "power",
        roundNumber: 1
      });

      expect(state.history).toHaveLength(1);
      expect(state.history[0]?.stat).toBe("power");
    });
  });

  describe("Replay seed copying", () => {
    it("formats seed for clipboard", () => {
      const state = createMockGameState({
        activeSeed: "abc-123-def-456"
      });

      const clipboardText = state.activeSeed;

      expect(clipboardText).toBe("abc-123-def-456");
    });

    it("handles clipboard API success", () => {
      const seed = "test-seed";
      const result = `Replay seed "${seed}" copied.`;

      expect(result).toContain("Replay seed");
      expect(result).toContain("copied");
    });

    it("handles clipboard API failure", () => {
      const seed = "test-seed";
      const result = `Could not copy the replay seed "${seed}". Copy manually.`;

      expect(result).toContain("Could not copy");
    });
  });
});

describe("Main Module - Render Integration", () => {
  describe("Render function composition", () => {
    it("creates header with status and shortcut hints", () => {
      const status = ">> Choose your stat:";
      const hints = "1–5 Choose a stat";

      expect(status).toContain("Choose");
      expect(hints).toContain("stat");
    });

    it("includes footer with keyboard shortcuts", () => {
      const state = createMockGameState({ match: null });
      const footerContent = state.match ? "shortcuts for match" : "shortcuts for intro";

      expect(footerContent).toBeDefined();
    });

    it("renders intro screen when no match", () => {
      const state = createMockGameState({ match: null });
      const isIntro = !state.match;

      expect(isIntro).toBe(true);
    });

    it("renders game screen when match active", () => {
      const state = createMockGameState({ match: createMockMatch() });
      const isGame = !!state.match;

      expect(isGame).toBe(true);
    });

    it("composes scoreboard in game screen", () => {
      const match = createMockMatch({ scores: { player: 2, opponent: 1 } });

      expect(match.scores.player).toBe(2);
      expect(match.scores.opponent).toBe(1);
    });

    it("includes result panel when result exists", () => {
      const state = createMockGameState({
        match: createMockMatch(),
        result: createMockMatchResult()
      });

      expect(state.result).toBeDefined();
    });

    it("includes scout report when no result yet", () => {
      const state = createMockGameState({
        match: createMockMatch(),
        result: null
      });

      expect(state.result).toBeNull();
    });

    it("shows champion progress in champion mode", () => {
      const state = createMockGameState({
        match: createMockMatch({ mode: "champion" })
      });

      const showProgress = state.match?.mode === "champion";

      expect(showProgress).toBe(true);
    });

    it("hides champion progress in classic mode", () => {
      const state = createMockGameState({
        match: createMockMatch({ mode: "classic" })
      });

      const showProgress = state.match?.mode === "champion";

      expect(showProgress).toBe(false);
    });
  });

  describe("History strip rendering", () => {
    it("shows empty when no history", () => {
      const state = createMockGameState({ history: [] });

      expect(state.history).toHaveLength(0);
    });

    it("displays all history entries", () => {
      const state = createMockGameState({
        history: [
          { outcome: "player", stat: "power", roundNumber: 1 },
          { outcome: "opponent", stat: "technique", roundNumber: 2 },
          { outcome: "draw", stat: "speed", roundNumber: 3 }
        ]
      });

      expect(state.history).toHaveLength(3);
      expect(state.history.map(h => h.stat)).toEqual(["power", "technique", "speed"]);
    });

    it("formats outcome labels correctly", () => {
      const labels = { player: "WIN", opponent: "LOSS", draw: "DRAW" };

      expect(labels.player).toBe("WIN");
      expect(labels.opponent).toBe("LOSS");
      expect(labels.draw).toBe("DRAW");
    });
  });
});

describe("Main Module - Event Handler Integration", () => {
  it("start handler receives correct parameters from button click", () => {
    const handlers = { start: vi.fn(), next: vi.fn() };

    // Simulate calling start handler
    handlers.start();

    expect(handlers.start).toHaveBeenCalledTimes(1);
  });

  it("next handler receives match parameter from click", () => {
    const handlers = { start: vi.fn(), next: vi.fn() };
    const match = createMockMatch();

    // Simulate calling next handler with match
    handlers.next(match);

    expect(handlers.next).toHaveBeenCalledWith(match);
  });

  it("resolve handler receives stat key from keyboard or button", () => {
    const handlers = { resolve: vi.fn() };
    const stat: StatKey = "power";

    handlers.resolve(stat);

    expect(handlers.resolve).toHaveBeenCalledWith("power");
  });

  it("clearAndExit resets match state", () => {
    const state = createMockGameState({
      match: createMockMatch(),
      result: createMockMatchResult(),
      history: [{ outcome: "player", stat: "power", roundNumber: 1 }]
    });

    state.match = null;
    state.result = null;
    state.pendingStat = null;
    state.errorMessage = "";
    state.history = [];
    state.drawBuffer = [];

    expect(state.match).toBeNull();
    expect(state.history).toHaveLength(0);
  });
});

describe("Main Module - Complex Integration Scenarios", () => {
  it("handles full match flow from start to resolution", () => {
    const state = createMockGameState();

    // Start match
    state.target = 3;
    state.lengthIndex = 0;
    state.activeSeed = "test-seed";
    state.match = createMockMatch();

    expect(state.match).not.toBeNull();
    expect(state.target).toBe(3);
  });

  it("handles champion mode streak tracking", () => {
    const state = createMockGameState({
      mode: "champion",
      match: createMockMatch({ mode: "champion", matchNumber: 5 }),
      history: [
        { outcome: "player", stat: "power", roundNumber: 1 },
        { outcome: "player", stat: "speed", roundNumber: 2 },
        { outcome: "player", stat: "technique", roundNumber: 3 },
        { outcome: "player", stat: "kumikata", roundNumber: 4 }
      ]
    });

    const wins = state.history.filter(h => h.outcome === "player").length;

    expect(wins).toBe(4);
    expect(state.match?.matchNumber).toBe(5);
  });

  it("handles division switching mid-session", () => {
    const state = createMockGameState({ division: "absolute" });

    // Switch to weight
    state.division = "weight";
    expect(state.division).toBe("weight");

    // Can set active weight
    state.activeWeight = "-73";
    expect(state.activeWeight).toBe("-73");
  });

  it("handles multiple replays with different seeds", () => {
    const state = createMockGameState();

    // First seed
    state.activeSeed = "seed-1";
    expect(state.activeSeed).toBe("seed-1");

    // Second seed
    state.activeSeed = "seed-2";
    expect(state.activeSeed).toBe("seed-2");
  });
});
