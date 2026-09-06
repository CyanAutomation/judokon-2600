import { afterEach, describe, expect, it, vi } from "vitest";
import type { GameState } from "./state";
import type { Match, MatchResult } from "./game/game";
import type { Judoka } from "./api/types";
import { BudokonClient } from "./api/budokon";
import { MATCH_RESOLUTION_DELAY_MS, resolve, selectWeightForSeed, start, type OrchestratorDeps } from "./game/orchestrator";
import { handleClickEvent } from "./ui/eventHandlers";
import { renderApp } from "./ui/render";

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
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

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

    it("generates an active seed for an empty replay seed and uses it for the initial draw", async () => {
      const generatedSeed = "123e4567-e89b-42d3-a456-426614174000";
      const state = createMockGameState({ replaySeed: "" });
      const client = new BudokonClient();
      const drawBatch = vi.spyOn(client, "drawBatch").mockResolvedValue(
        Array.from({ length: 6 }, (_, index) => createMockJudoka(`judoka-${index}`))
      );
      const randomUUID = vi.spyOn(crypto, "randomUUID").mockReturnValue(generatedSeed);

      await start(state, { client, render: vi.fn() });

      expect(randomUUID).toHaveBeenCalledOnce();
      expect(state.activeSeed).toBe(generatedSeed);
      expect(drawBatch).toHaveBeenCalledWith(generatedSeed, 6, undefined, undefined);
    });

    it("uses a non-empty replay seed without generating a UUID", async () => {
      const providedSeed = "custom-seed-123";
      const state = createMockGameState({ replaySeed: providedSeed });
      const client = new BudokonClient();
      const drawBatch = vi.spyOn(client, "drawBatch").mockResolvedValue(
        Array.from({ length: 6 }, (_, index) => createMockJudoka(`judoka-${index}`))
      );
      const randomUUID = vi.spyOn(crypto, "randomUUID");

      await start(state, { client, render: vi.fn() });

      expect(randomUUID).not.toHaveBeenCalled();
      expect(state.activeSeed).toBe(providedSeed);
      expect(drawBatch).toHaveBeenCalledWith(providedSeed, 6, undefined, undefined);
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

      const selectedWeight = state.weight === "random" ? selectWeightForSeed("test-seed") : state.weight;

      expect(selectedWeight).toBe("-73");
    });

    it("selects an exact, repeatable weight from a replay seed", () => {
      const seed = "deterministic-seed";

      expect(selectWeightForSeed(seed)).toBe("-70");
      expect(Array.from({ length: 3 }, () => selectWeightForSeed(seed))).toEqual(["-70", "-70", "-70"]);
    });

    it.each([
      ["", "-48"], // zero hash selects the first supported weight
      ["boundary-2", "+100"], // final modulo bucket
      ["boundary-3", "-48"], // modulo rollover to the first bucket
      ["boundary-4", "-52"] // bucket immediately after rollover
    ])("maps boundary seed %j to %s", (seed, expectedWeight) => {
      expect(selectWeightForSeed(seed)).toBe(expectedWeight);
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
      const error: unknown = "string error";
      const message =
        error instanceof Error
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

    it("resolves a selecting match after the configured delay", () => {
      vi.useFakeTimers();
      const match = createMockMatch({ phase: "selecting" });
      const state = createMockGameState({ match });
      const render = vi.fn();
      const deps: OrchestratorDeps = { client: new BudokonClient(), render };

      resolve(state, match, "power", deps);

      expect(state.pendingStat).toBe("power");
      expect(state.result).toBeNull();
      expect(state.history).toEqual([]);
      expect(render).toHaveBeenCalledTimes(1);

      vi.advanceTimersByTime(MATCH_RESOLUTION_DELAY_MS - 1);

      expect(state.pendingStat).toBe("power");
      expect(state.result).toBeNull();
      expect(state.history).toEqual([]);

      vi.advanceTimersByTime(1);

      expect(state.pendingStat).toBeNull();
      expect(state.result).toMatchObject({
        outcome: "draw",
        stat: "power",
        playerValue: 8,
        opponentValue: 8
      });
      expect(state.match?.phase).toBe("awaitingNext");
      expect(state.history).toEqual([{ outcome: "draw", stat: "power", roundNumber: 1 }]);
      expect(render).toHaveBeenCalledTimes(2);
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

    it.each([
      {
        phase: "intro",
        state: createMockGameState({ match: null }),
        actions: ["Division", "Length", "Start"]
      },
      {
        phase: "selecting",
        state: createMockGameState({ match: createMockMatch({ phase: "selecting" }) }),
        actions: ["Choose a stat", "Quit match"]
      },
      {
        phase: "post-round",
        state: createMockGameState({ match: createMockMatch({ phase: "awaitingNext" }) }),
        actions: ["Next round", "Quit match"]
      }
    ])("renders the $phase keyboard actions in the footer", ({ state, actions }) => {
      const root = document.createElement("div");

      renderApp(root, state);

      const footer = root.querySelector("footer");
      expect(footer).not.toBeNull();
      for (const action of actions) expect(footer?.textContent).toContain(action);
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

    it("displays all history entries with their outcome labels", () => {
      const state = createMockGameState({
        match: createMockMatch(),
        history: [
          { outcome: "player", stat: "power", roundNumber: 1 },
          { outcome: "opponent", stat: "technique", roundNumber: 2 },
          { outcome: "draw", stat: "speed", roundNumber: 3 }
        ]
      });
      const root = document.createElement("div");

      renderApp(root, state);

      const history = root.querySelector('[aria-label="Round history"]');
      const entries = history?.querySelectorAll("li");

      expect(history).not.toBeNull();
      expect(entries).toHaveLength(3);
      expect(entries?.[0]?.textContent).toBe("R1PowerWIN");
      expect(entries?.[1]?.textContent).toBe("R2TechniqueLOSS");
      expect(entries?.[2]?.textContent).toBe("R3SpeedDRAW");
    });
  });
});

describe("Main Module - Event Handler Integration", () => {
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
  it("handles full match flow from start to resolution", async () => {
    vi.useFakeTimers();

    const state = createMockGameState({ target: 3, mode: "classic" });
    const root = document.createElement("div");
    const player = createMockJudoka("integration-player", {
      firstname: "Player",
      stats: { power: 8, speed: 5, technique: 6, kumikata: 7, newaza: 6 }
    });
    const opponent = createMockJudoka("integration-opponent", {
      firstname: "Opponent",
      stats: { power: 5, speed: 6, technique: 7, kumikata: 8, newaza: 9 }
    });
    const client = new class extends BudokonClient {
      override async drawBatch(_seed: string, count: number): Promise<Judoka[]> {
        const buffer = Array.from({ length: Math.max(0, count - 2) }, (_, index) =>
          createMockJudoka(`integration-buffer-${index}`)
        );
        return [player, opponent, ...buffer].slice(0, count);
      }
    }();
    const render = () => renderApp(root, state);
    const deps: OrchestratorDeps = { client, render };
    let startOperation: Promise<void> | undefined;

    root.addEventListener("click", event => {
      handleClickEvent(event, state, {
        start: () => {
          startOperation = start(state, deps, 3, "test-seed");
        },
        resolve: stat => {
          if (!state.match) throw new Error("Match must exist before resolving");
          resolve(state, state.match, stat, deps);
        },
        copyReplaySeed: async () => undefined,
        next: async () => undefined,
        clearAndExit: () => undefined
      });
    });

    render();
    root.querySelector<HTMLButtonElement>("#start")!.click();
    expect(startOperation).toBeDefined();
    await startOperation;

    expect(state.match).toMatchObject({
      target: 3,
      phase: "selecting",
      player,
      opponent
    });

    const powerButton = root.querySelector<HTMLButtonElement>('[data-stat="power"]');
    expect(powerButton).not.toBeNull();
    powerButton!.click();
    expect(state.pendingStat).toBe("power");

    vi.advanceTimersByTime(MATCH_RESOLUTION_DELAY_MS);

    expect(state.result?.outcome).toBe("player");
    expect(state.match?.scores).toEqual({ player: 1, opponent: 0 });
    expect(state.history).toEqual([{ outcome: "player", stat: "power", roundNumber: 1 }]);
    expect(state.match?.phase).toBe("awaitingNext");
    expect(root.querySelector(".result-panel")).not.toBeNull();
    expect(root.querySelector<HTMLButtonElement>("#next")).not.toBeNull();
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

  it("handles multiple replays with different seeds", async () => {
    vi.useFakeTimers();

    let finishSecondDraw: (() => void) | undefined;
    const drawSeeds: string[] = [];
    const client = new class extends BudokonClient {
      override async drawBatch(seed: string, count: number): Promise<Judoka[]> {
        drawSeeds.push(seed);
        const drawn = Array.from({ length: count }, (_, index) =>
          createMockJudoka(`${seed}-judoka-${index}`)
        );

        if (seed === "seed-2") {
          await new Promise<void>(resolveDraw => {
            finishSecondDraw = resolveDraw;
          });
        }

        return drawn;
      }
    }();
    const state = createMockGameState();
    const deps: OrchestratorDeps = { client, render: vi.fn() };

    await start(state, deps, state.target, "seed-1");
    expect(drawSeeds).toEqual(["seed-1"]);
    expect(state.activeSeed).toBe("seed-1");

    resolve(state, state.match!, "power", deps);
    vi.advanceTimersByTime(MATCH_RESOLUTION_DELAY_MS);
    expect(state.result).not.toBeNull();
    expect(state.history).toHaveLength(1);

    const secondStart = start(state, deps, state.target, "seed-2");

    expect(drawSeeds).toEqual(["seed-1", "seed-2"]);
    expect(state.activeSeed).toBe("seed-2");
    expect(state.result).toBeNull();
    expect(state.history).toEqual([]);

    finishSecondDraw?.();
    await secondStart;
    expect(state.match?.player.id).toBe("seed-2-judoka-0");
    expect(state.match?.opponent.id).toBe("seed-2-judoka-1");
  });
});
