import { afterEach, describe, expect, it, vi } from "vitest";
import type { Match, MatchResult } from "./game/game";
import type { Judoka } from "./api/types";
import { BudokonClient } from "./api/budokon";
import * as audio from "./audio";
import { chooseLength, clearAndExit, copyReplaySeed, MATCH_RESOLUTION_DELAY_MS, next, resolve, selectWeightForSeed, start, type OrchestratorDeps } from "./game/orchestrator";
import { handleClickEvent } from "./ui/eventHandlers";
import { renderApp } from "./ui/render";
import { createMockJudoka, createMockMatch, createMockMatchResult, createMockGameState } from "./test/mocks";

describe("Main Module - Render Functions", () => {
  describe("Fighter card generation", () => {
    it("reveals the selected stat and both values only after the round resolves", () => {
      const player = createMockJudoka("player", {
        stats: { power: 17, speed: 16, technique: 15, kumikata: 14, newaza: 13 }
      });
      const opponent = createMockJudoka("opponent", {
        firstname: "Rival",
        stats: { power: 3, speed: 91, technique: 92, kumikata: 93, newaza: 94 }
      });
      const match = createMockMatch({ player, opponent });
      const root = document.createElement("div");

      renderApp(root, createMockGameState({ match }));

      const concealedOpponent = root.querySelector(".fighter-card.opponent");
      expect(concealedOpponent).not.toBeNull();
      for (const value of Object.values(opponent.stats)) {
        expect(concealedOpponent?.textContent).not.toContain(String(value));
      }

      const result: MatchResult = {
        match: { ...match, phase: "awaitingNext" },
        outcome: "player",
        stat: "power",
        playerValue: player.stats.power,
        opponentValue: opponent.stats.power
      };
      renderApp(root, createMockGameState({ match: result.match, result }));

      const resultPanel = root.querySelector(".result-panel");
      expect(resultPanel).not.toBeNull();
      expect(resultPanel?.textContent).toContain("You used 17 in Power. Rival Fighter had 3.");
    });

    it("[REQ-UI-011] identifies both judoka by name once the round has resolved", () => {
      const player = createMockJudoka("player", { firstname: "Aiko", surname: "Tanaka" });
      const opponent = createMockJudoka("opponent", { firstname: "Mina", surname: "Sato" });
      const match = createMockMatch({ player, opponent, phase: "awaitingNext" });
      const result = { ...createMockMatchResult(), match };
      const root = document.createElement("div");

      renderApp(root, createMockGameState({ match, result }));

      expect(root.querySelector('[aria-label="Your judoka: Aiko Tanaka"]')?.textContent).toContain("Aiko Tanaka");
      expect(root.querySelector('[aria-label="Opponent: Mina Sato"]')?.textContent).toContain("Mina Sato");
    });

    it.each([
      { rarity: "Elite", expectedLabel: "Elite" },
      { rarity: undefined, expectedLabel: "Unclassified" }
    ])("renders $expectedLabel as the player's rarity", ({ rarity, expectedLabel }) => {
      const player = createMockJudoka("p1", { rarity });
      const state = createMockGameState({
        match: createMockMatch({ player })
      });
      const root = document.createElement("div");

      renderApp(root, state);

      const playerCard = root.querySelector('[aria-label="Your judoka: Test Fighter"]');
      const rarityBadge = playerCard?.querySelector(".rarity");
      expect(playerCard).not.toBeNull();
      expect(rarityBadge?.textContent).toBe(expectedLabel);
    });
  });
});

describe("Main Module - State Orchestration Functions", () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  describe("Match initialization (start function logic)", () => {
    it.each([
      [3, 0],
      [5, 1],
      [10, 2]
    ])("chooses match length %i at index %i through the orchestrator", (target, expectedIndex) => {
      const state = createMockGameState({ target: 0, lengthIndex: -1 });
      const root = document.createElement("div");
      document.body.append(root);
      const render = vi.fn(() => renderApp(root, state));

      chooseLength(state, target, { client: new BudokonClient(), render });

      const selectedLength = root.querySelector<HTMLInputElement>(`[data-length="${target}"]`);

      expect(state).toMatchObject({ target, lengthIndex: expectedIndex });
      expect(render).toHaveBeenCalledOnce();
      expect(selectedLength?.checked).toBe(true);
      expect(document.activeElement).toBe(selectedLength);

      root.remove();
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

    it("clears game state on start and installs the newly drawn match", async () => {
      const staleBuffer = [createMockJudoka("stale-buffer")];
      const drawn = Array.from({ length: 6 }, (_, index) => createMockJudoka(`new-judoka-${index}`));
      const state = createMockGameState({
        match: createMockMatch(),
        result: createMockMatchResult(),
        history: [{ outcome: "player", stat: "power", roundNumber: 1 }],
        pendingStat: "power",
        errorMessage: "Previous draw failed",
        drawBuffer: staleBuffer
      });
      const client = new class extends BudokonClient {
        override async drawBatch(): Promise<Judoka[]> {
          return drawn;
        }
      }();
      const render = vi.fn();

      await start(state, { client, render }, state.target, "new-seed");

      expect(state.match).toMatchObject({
        player: drawn[0],
        opponent: drawn[1],
        phase: "selecting",
        matchNumber: 1
      });
      expect(state.result).toBeNull();
      expect(state.history).toEqual([]);
      expect(state.pendingStat).toBeNull();
      expect(state.errorMessage).toBe("");
      expect(state.drawBuffer).toEqual(drawn.slice(2));
      expect(state.drawBuffer).not.toContain(staleBuffer[0]);
      expect(render).toHaveBeenCalledTimes(2);
    });

    it("[REQ-GAME-008] sends the selected weight class with the initial draw", async () => {
      const state = createMockGameState({
        division: "weight",
        weight: "-73",
        replaySeed: "weight-class-seed"
      });
      const client = new BudokonClient();
      const drawBatch = vi.spyOn(client, "drawBatch").mockResolvedValue(
        Array.from({ length: 6 }, (_, index) => createMockJudoka(`weight-judoka-${index}`))
      );

      await start(state, { client, render: vi.fn() });

      expect(state.activeWeight).toBe("-73");
      expect(drawBatch).toHaveBeenCalledWith("weight-class-seed", 6, "-73", undefined);
    });

    it("[REQ-GAME-009] selects the same weight class from the same replay seed", () => {
      const seed = "deterministic-seed";

      expect(selectWeightForSeed(seed)).toBe("-70");
      expect(Array.from({ length: 3 }, () => selectWeightForSeed(seed))).toEqual(["-70", "-70", "-70"]);
    });

    it.each([
      ["", "-48"], // zero hash selects the first supported weight
      ["boundary-2", "+100"], // final modulo bucket
      ["boundary-3", "-48"], // modulo rollover to the first bucket
      ["boundary-4", "-52"] // bucket immediately after rollover
    ])("[REQ-GAME-009] maps boundary seed %j to %s", (seed, expectedWeight) => {
      expect(selectWeightForSeed(seed)).toBe(expectedWeight);
    });
  });

  describe("Draw error handling", () => {
    it.each([
      ["incompatible judoka", new Error("No compatible judoka found"), "No compatible judoka found. Choose Absolute or another division."],
      ["network failure", new Error("Network failed"), "Network failed. Check your connection and try again."],
      ["non-Error rejection", "string error", "Unable to draw judoka. Please try again."]
    ])("[REQ-UI-009] shows an actionable setup message after a %s", async (_scenario, failure, expectedMessage) => {
      const root = document.createElement("div");
      const state = createMockGameState({ replaySeed: "failed-draw-seed" });
      const client = new class extends BudokonClient {
        override async drawBatch(): Promise<Judoka[]> {
          throw failure;
        }
      }();
      const visibleMessages: string[] = [];
      const render = vi.fn(() => {
        renderApp(root, state);
        visibleMessages.push(root.querySelector<HTMLElement>('[role="status"]')?.textContent?.trim() ?? "");
      });

      await start(state, { client, render });

      expect(state.errorMessage).toBe(expectedMessage);
      expect(state.busy).toBe(false);
      expect(state.match).toBeNull();
      expect(visibleMessages[0]).toContain("Drawing judoka");
      expect(root.querySelector<HTMLElement>('[role="status"]')?.textContent).toContain(expectedMessage);
    });
  });

  describe("Match resolution (resolve function logic)", () => {
    it.each([
      { name: "match is null", match: null, pendingStat: null },
      { name: "phase is not selecting", match: createMockMatch({ phase: "awaitingNext" }), pendingStat: null },
      { name: "a selection is already pending", match: createMockMatch(), pendingStat: "power" as const }
    ])("rejects resolution when $name without state changes or side effects", ({ match, pendingStat }) => {
      vi.useFakeTimers();
      const state = createMockGameState({ match, pendingStat });
      const stateBeforeResolution = structuredClone(state);
      const client = new BudokonClient();
      const drawBatch = vi.spyOn(client, "drawBatch");
      const render = vi.fn();
      const onMatchReady = vi.fn();
      const save = vi.spyOn(Storage.prototype, "setItem");
      const playOutcome = vi.spyOn(audio, "outcomeBeep");

      resolve(state, match as Match, "speed", { client, render, onMatchReady });

      expect(state).toEqual(stateBeforeResolution);
      expect(render).not.toHaveBeenCalled();
      expect(onMatchReady).not.toHaveBeenCalled();
      expect(drawBatch).not.toHaveBeenCalled();
      expect(save).not.toHaveBeenCalled();
      expect(playOutcome).not.toHaveBeenCalled();
      expect(vi.getTimerCount()).toBe(0);
    });

    it("resolves a selecting match after the configured delay", () => {
      vi.useFakeTimers();
      const match = createMockMatch({
        phase: "selecting",
        scores: { player: 1, opponent: 1 },
        player: createMockJudoka("player", {
          stats: { power: 9, speed: 5, technique: 6, kumikata: 7, newaza: 6 }
        }),
        opponent: createMockJudoka("opponent", {
          stats: { power: 4, speed: 5, technique: 6, kumikata: 7, newaza: 6 }
        })
      });
      const state = createMockGameState({ match, pendingStat: null });
      const render = vi.fn();
      const deps: OrchestratorDeps = { client: new BudokonClient(), render };
      const saveSpy = vi.spyOn(Storage.prototype, "setItem");

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
        outcome: "player",
        stat: "power",
        playerValue: 9,
        opponentValue: 4
      });
      expect(state.match?.phase).toBe("awaitingNext");
      expect(state.match?.scores).toEqual({ player: 2, opponent: 1 });
      expect(state.history).toHaveLength(1);
      expect(state.history[0]).toEqual({ outcome: "player", stat: "power", roundNumber: 1 });
      expect(saveSpy).toHaveBeenCalledOnce();
      expect(saveSpy).toHaveBeenCalledWith(
        "judokon.activeMatch.v1",
        expect.stringContaining('"stat":"power"')
      );
      expect(render).toHaveBeenCalledTimes(2);

      const secondMatch = createMockMatch({ matchNumber: 2 });
      state.match = secondMatch;

      resolve(state, secondMatch, "speed", deps);
      vi.advanceTimersByTime(MATCH_RESOLUTION_DELAY_MS);

      expect(state.history).toHaveLength(2);
      expect(state.history[1]).toEqual({ outcome: "draw", stat: "speed", roundNumber: 2 });
      expect(saveSpy).toHaveBeenCalledTimes(2);
      expect(render).toHaveBeenCalledTimes(4);
    });
  });

  describe("Replay seed copying", () => {
    it("copies the active replay seed and shows confirmation", async () => {
      const state = createMockGameState({
        activeSeed: "abc-123-def-456"
      });
      const writeText = vi.fn().mockResolvedValue(undefined);
      const originalClipboard = Object.getOwnPropertyDescriptor(navigator, "clipboard");
      Object.defineProperty(navigator, "clipboard", {
        configurable: true,
        value: { writeText }
      });

      try {
        await copyReplaySeed(state, {
          client: new BudokonClient(),
          render: () => undefined
        });

        expect(writeText).toHaveBeenCalledOnce();
        expect(writeText).toHaveBeenCalledWith("abc-123-def-456");
        expect(state.seedMessage).toBe("Replay seed copied.");
      } finally {
        if (originalClipboard) {
          Object.defineProperty(navigator, "clipboard", originalClipboard);
        } else {
          delete (navigator as unknown as { clipboard?: Clipboard }).clipboard;
        }
      }
    });

    it("handles clipboard API success", async () => {
      const state = createMockGameState({ activeSeed: "test-seed" });
      const writeText = vi.fn().mockResolvedValue(undefined);
      const render = vi.fn();
      const originalClipboard = Object.getOwnPropertyDescriptor(navigator, "clipboard");
      Object.defineProperty(navigator, "clipboard", {
        configurable: true,
        value: { writeText }
      });

      try {
        let copyOperation: Promise<void> | undefined;
        const copyButton = document.createElement("button");
        copyButton.id = "copy-seed";

        // Dispatch the event from the button so the delegated replay-copy handler runs.
        copyButton.addEventListener("click", event => {
          handleClickEvent(event, state, {
            start: vi.fn(),
            copyReplaySeed: () => {
              copyOperation = copyReplaySeed(state, {
                client: new BudokonClient(),
                render
              });
              return copyOperation;
            },
            next: vi.fn(),
            resolve: vi.fn(),
            clearAndExit: vi.fn()
          });
        });
        copyButton.click();
        if (!copyOperation) throw new Error("copyOperation must be defined after click");
        await copyOperation;

        expect(writeText).toHaveBeenCalledOnce();
        expect(writeText).toHaveBeenCalledWith(state.activeSeed);
        expect(state.seedMessage).toBe("Replay seed copied.");
        expect(render).toHaveBeenCalledOnce();
      } finally {
        if (originalClipboard) {
          Object.defineProperty(navigator, "clipboard", originalClipboard);
        } else {
          delete (navigator as unknown as { clipboard?: Clipboard }).clipboard;
        }
      }
    });

    it("handles clipboard API failure", async () => {
      const state = createMockGameState({ activeSeed: "test-seed" });
      const clipboardError = new Error("Clipboard permission denied");
      const writeText = vi.fn().mockRejectedValue(clipboardError);
      const render = vi.fn();
      const originalClipboard = Object.getOwnPropertyDescriptor(navigator, "clipboard");
      Object.defineProperty(navigator, "clipboard", {
        configurable: true,
        value: { writeText }
      });

      try {
        let copyOperation: Promise<void> | undefined;
        const copyButton = document.createElement("button");
        copyButton.id = "copy-seed";
        copyButton.addEventListener("click", event => {
          handleClickEvent(event, state, {
            start: vi.fn(),
            copyReplaySeed: () => {
              copyOperation = copyReplaySeed(state, {
                client: new BudokonClient(),
                render
              });
              return copyOperation;
            },
            next: vi.fn(),
            resolve: vi.fn(),
            clearAndExit: vi.fn()
          });
        });

        copyButton.click();
        if (!copyOperation) throw new Error("copyOperation must be defined after click");

        await expect(copyOperation).resolves.toBeUndefined();
        expect(writeText).toHaveBeenCalledOnce();
        expect(writeText).toHaveBeenCalledWith("test-seed");
        expect(state.seedMessage).toBe('Could not copy the replay seed "test-seed". Copy manually.');
        expect(render).toHaveBeenCalledOnce();
      } finally {
        if (originalClipboard) {
          Object.defineProperty(navigator, "clipboard", originalClipboard);
        } else {
          delete (navigator as unknown as { clipboard?: Clipboard }).clipboard;
        }
      }
    });
  });
});

describe("Main Module - Render Integration", () => {
  describe("Render function composition", () => {
    it("creates header with status and shortcut hints", () => {
      const state = createMockGameState({
        match: createMockMatch({ phase: "selecting" })
      });
      const root = document.createElement("div");

      renderApp(root, state);

      const status = root.querySelector<HTMLElement>("header + main #status");
      const shortcutHints = root.querySelectorAll<HTMLElement>("footer .shortcut-hint");
      const statShortcut = Array.from(shortcutHints).find((hint) => hint.textContent === "1–5");
      const visibleStatus = status?.cloneNode(true) as HTMLElement | undefined;
      visibleStatus?.querySelectorAll('[aria-hidden="true"]').forEach((element) => element.remove());

      expect(visibleStatus?.textContent?.trim()).toBe(">> Choose your stat:");
      expect(statShortcut).toBeDefined();
      expect(statShortcut?.parentElement?.textContent).toContain("1–5 Choose a stat");
    });

    it.each([
      {
        phase: "intro",
        state: createMockGameState({ match: null }),
        actions: ["Length", "Start"]
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

    it("groups footer shortcuts and setup utilities in one toolbar and keeps dialogs outside it", () => {
      const root = document.createElement("div");

      renderApp(root, createMockGameState({ match: null, seedModalOpen: true }));

      const toolbar = root.querySelector("footer .footer-toolbar");
      expect(toolbar).not.toBeNull();
      expect(toolbar?.querySelector(".footer-hint") ?? null).not.toBeNull();
      expect(toolbar?.querySelector(".footer-utilities #seed-button") ?? null).not.toBeNull();
      expect(toolbar?.querySelector(".footer-utilities #sound-enabled") ?? null).not.toBeNull();
      expect(root.querySelector("footer .seed-dialog")).toBeNull();
      expect(root.querySelector(".modal-backdrop .seed-dialog")).not.toBeNull();
    });

    it("[REQ-UI-001] renders setup choices when no match is active", () => {
      const root = document.createElement("div");
      renderApp(root, createMockGameState({ match: null, setupStep: "mode" }));

      expect(root.querySelector("#intro-title")).not.toBeNull();
      expect(root.querySelector("fieldset legend")?.textContent).toBe("Choose game mode");
      expect(root.querySelector('[aria-label="Stat selection"]')).toBeNull();
    });

    it("[REQ-UI-001] renders match controls when a match is active", () => {
      const root = document.createElement("div");
      renderApp(root, createMockGameState({ match: createMockMatch() }));

      expect(root.querySelector('[aria-label^="Match score:"]')).not.toBeNull();
      expect(root.querySelector('[aria-label="Stat selection"]')).not.toBeNull();
      expect(root.querySelector("#intro-title")).toBeNull();
    });

    it("[REQ-UI-002] exposes the current score and target in the match scoreboard", () => {
      const root = document.createElement("div");
      const match = createMockMatch({ scores: { player: 2, opponent: 1 }, target: 3 });
      renderApp(root, createMockGameState({ match }));

      expect(root.querySelector('[aria-label="Match score: You 2, opponent 1. First to 3 points."]')).not.toBeNull();
    });

    it("[REQ-UI-003] reveals the selected stat and both values in the resolved round result", () => {
      const root = document.createElement("div");
      const match = createMockMatch({ phase: "awaitingNext" });
      const result = { ...createMockMatchResult(), match };
      renderApp(root, createMockGameState({ match, result }));

      const panel = root.querySelector('[aria-label="Round result"]');
      expect(panel?.textContent).toContain("You used 8 in Power. Test Fighter had 5.");
    });

    it("[REQ-UI-004] shows the opponent's strongest stat in the scout report before resolution", () => {
      const root = document.createElement("div");
      const opponent = createMockJudoka("opponent", {
        stats: { power: 1, speed: 2, technique: 10, kumikata: 3, newaza: 4 }
      });
      const match = createMockMatch({ opponent });
      renderApp(root, createMockGameState({ match, result: null }));

      const report = root.querySelector('[aria-label="Scout report"]');
      expect(report?.textContent).toContain("Technique");
      expect(report?.textContent).not.toContain("10");
    });

    it("[REQ-CHAMPION-005] shows run progress for Champion matches", () => {
      const root = document.createElement("div");
      const match = createMockMatch({ mode: "champion", matchNumber: 5 });
      const history = [
        { outcome: "player", stat: "power", roundNumber: 1 },
        { outcome: "opponent", stat: "technique", roundNumber: 2 },
        { outcome: "player", stat: "newaza", roundNumber: 3 }
      ] as const;
      renderApp(root, createMockGameState({ match, history: [...history] }));

      const progress = root.querySelector('[aria-label="Champion round progress"]');
      expect(progress?.textContent).toContain("1 round");
      expect(progress?.textContent).toContain("2–1–0");
      expect(progress?.textContent).toContain("5");
    });

    it("[REQ-CHAMPION-005] omits Champion run progress for Classic matches", () => {
      const root = document.createElement("div");
      renderApp(root, createMockGameState({ match: createMockMatch({ mode: "classic" }) }));

      expect(root.querySelector('[aria-label="Champion round progress"]')).toBeNull();
    });
  });

  describe("History strip rendering", () => {
    it("[REQ-UI-006] omits the round-history region until a round has resolved", () => {
      const root = document.createElement("div");
      renderApp(root, createMockGameState({ match: createMockMatch(), history: [] }));

      expect(root.querySelector('[aria-label="Round history"]')).toBeNull();
      expect(root.querySelector('[aria-label^="Match score:"]')).not.toBeNull();
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
  it("[REQ-GAME-007] quitting clears the active run, removes its saved state, and returns to setup", () => {
    const state = createMockGameState({
      match: createMockMatch(),
      result: createMockMatchResult(),
      tacticalAssessment: { overReliance: true },
      pendingStat: "power",
      busy: true,
      errorMessage: "Draw failed",
      history: [{ outcome: "player", stat: "power", roundNumber: 1 }],
      drawBuffer: [createMockJudoka("buffered")],
      setupStep: "weight"
    });
    const render = vi.fn();
    sessionStorage.setItem("judokon.activeMatch.v1", "saved-run");

    clearAndExit(state, { client: new BudokonClient(), render });

    expect(state).toMatchObject({
      match: null,
      result: null,
      tacticalAssessment: null,
      pendingStat: null,
      busy: false,
      errorMessage: "",
      history: [],
      drawBuffer: [],
      setupStep: "mode"
    });
    expect(sessionStorage.getItem("judokon.activeMatch.v1")).toBeNull();
    expect(render).toHaveBeenCalledOnce();
  });
});

describe("Main Module - Complex Integration Scenarios", () => {
  it("replays a deterministic buffer from the beginning after the prior buffer is exhausted", async () => {
    const fetcher = vi.fn((_url: string, init?: RequestInit) => {
      const { count, seed } = JSON.parse(init?.body as string) as { count: number; seed: string };
      const drawn = Array.from({ length: count }, (_, index) => createMockJudoka(`${seed}-judoka-${index}`));
      return Promise.resolve(new Response(JSON.stringify({ judoka: drawn }), { status: 200 }));
    }) as unknown as typeof fetch;
    const match = createMockMatch({ matchNumber: 3, mode: "classic", phase: "awaitingNext" });
    const state = createMockGameState({ activeSeed: "replay-seed", drawBuffer: [], match });
    const deps: OrchestratorDeps = { client: new BudokonClient(fetcher), render: vi.fn() };

    await next(state, match, deps);
    expect([state.match?.player.id, state.match?.opponent.id]).toEqual([
      "replay-seed:buffer:4-judoka-0",
      "replay-seed:buffer:4-judoka-1"
    ]);

    state.drawBuffer.splice(0);
    await next(state, match, deps);

    expect([state.match?.player.id, state.match?.opponent.id]).toEqual([
      "replay-seed:buffer:4-judoka-0",
      "replay-seed:buffer:4-judoka-1"
    ]);
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it("advances, consumes the fetched buffer, and saves once when next is called concurrently", async () => {
    let resolveDraw!: (fighters: Judoka[]) => void;
    const drawPromise = new Promise<Judoka[]>((resolve) => {
      resolveDraw = resolve;
    });
    const client = new class extends BudokonClient {
      override drawBatch(): Promise<Judoka[]> {
        return drawPromise;
      }
    }();
    const match = createMockMatch({ matchNumber: 2, mode: "classic", phase: "awaitingNext" });
    const state = createMockGameState({ activeSeed: "concurrent", drawBuffer: [], match });
    const deps: OrchestratorDeps = { client, render: vi.fn() };
    const saveSpy = vi.spyOn(Storage.prototype, "setItem");

    const first = next(state, match, deps);
    const second = next(state, match, deps);
    resolveDraw(Array.from({ length: 6 }, (_, index) => createMockJudoka(`buffer-${index}`)));
    await Promise.all([first, second]);

    expect(state.match?.matchNumber).toBe(3);
    expect([state.match?.player.id, state.match?.opponent.id]).toEqual(["buffer-0", "buffer-1"]);
    expect(state.drawBuffer.map(({ id }) => id)).toEqual(["buffer-2", "buffer-3", "buffer-4", "buffer-5"]);
    expect(saveSpy).toHaveBeenCalledTimes(1);
    const [storageKey, serializedState] = saveSpy.mock.calls[0]!;
    expect(storageKey).toBe("judokon.activeMatch.v1");
    expect(JSON.parse(serializedState)).toMatchObject({
      match: {
        mode: "classic",
        matchNumber: 3,
        player: { id: "buffer-0" },
        opponent: { id: "buffer-1" }
      },
      drawBuffer: [
        { id: "buffer-2" },
        { id: "buffer-3" },
        { id: "buffer-4" },
        { id: "buffer-5" }
      ]
    });
  });

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
    const startButton = root.querySelector<HTMLButtonElement>("#start");
    if (!startButton) throw new Error("Start button must render before it can be clicked");
    startButton.click();
    expect(startOperation).toBeDefined();
    await startOperation;

    expect(state.match).toMatchObject({
      target: 3,
      phase: "selecting",
      player,
      opponent
    });

    const powerButton = root.querySelector<HTMLButtonElement>('[data-stat="power"]');
    if (!powerButton) throw new Error("Power stat button must render before it can be clicked");
    powerButton.click();
    expect(state.pendingStat).toBe("power");

    vi.advanceTimersByTime(MATCH_RESOLUTION_DELAY_MS);

    expect(state.result?.outcome).toBe("player");
    expect(state.match?.scores).toEqual({ player: 1, opponent: 0 });
    expect(state.history).toEqual([{ outcome: "player", stat: "power", roundNumber: 1 }]);
    expect(state.match?.phase).toBe("awaitingNext");
    expect(root.querySelector(".result-panel")).not.toBeNull();
    expect(root.querySelector<HTMLButtonElement>("#next")).not.toBeNull();
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
