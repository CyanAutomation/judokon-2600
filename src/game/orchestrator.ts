/**
 * Game State Orchestration Functions
 * 
 * Pure orchestration logic for state transitions, API calls, and side effects.
 * These functions manage game flow (start, draw, next, resolve) and persist state.
 * Separated from rendering to enable testing and reusability.
 */

import { BudokonClient } from "../api/budokon";
import { type Judoka, type StatKey } from "../api/types";
import { createMatch, nextMatch, selectStat, type Match } from "./game";
import { outcomeBeep } from "../audio";
import { clearSavedMatch, persistPreferences, saveGameState, type GameState } from "../state";

const DRAW_BUFFER_SIZE = 6;
export const MATCH_RESOLUTION_DELAY_MS = 650;
const weights = ["-48", "-52", "-57", "-60", "-63", "-66", "-70", "-73", "-78", "-81", "-90", "-100", "+78", "+100"] as const;
const lengths = [3, 5, 10] as const;
let nextOperationId = 0;
const currentOperations = new WeakMap<GameState, number>();

function beginOperation(state: GameState): number {
  const operationId = ++nextOperationId;
  currentOperations.set(state, operationId);
  return operationId;
}

function isCurrentOperation(state: GameState, operationId: number): boolean {
  return currentOperations.get(state) === operationId;
}

/** Select a supported weight class deterministically from a replay seed. */
export function selectWeightForSeed(seed: string): (typeof weights)[number] {
  let hash = 0;
  for (const character of seed) hash = (hash * 31 + character.charCodeAt(0)) >>> 0;
  return weights[hash % weights.length];
}

/**
 * Dependencies passed to orchestration functions
 * Allows mocking in tests
 */
export interface OrchestratorDeps {
  client: BudokonClient;
  render: () => void;
  onMatchReady?: () => void;
}

/**
 * Draw a batch of judoka from the API
 * Handles fallback to minimum count if no compatible fighters available
 */
export async function drawBatch(
  seed: string,
  count: number,
  minimum: number,
  state: GameState,
  client: BudokonClient,
  exclude?: string[]
): Promise<Judoka[]> {
  try {
    return await client.drawBatch(seed, count, state.activeWeight, exclude);
  } catch (error) {
    if (count > minimum && error instanceof Error && error.message.startsWith("No compatible")) {
      return client.drawBatch(seed, minimum, state.activeWeight, exclude);
    }
    throw error;
  }
}

/**
 * Initialize a new match
 * Resets game state, draws initial fighters, persists preferences
 */
export async function start(
  state: GameState,
  deps: OrchestratorDeps,
  points = state.target,
  seed?: string
): Promise<void> {
  if (state.busy) return;

  const operationId = beginOperation(state);
  const activeSeed = (seed ?? state.replaySeed.trim()) || crypto.randomUUID();
  state.target = points;
  state.lengthIndex = lengths.indexOf(points as (typeof lengths)[number]);
  state.activeSeed = activeSeed;

  state.activeWeight =
    state.division === "weight"
      ? state.weight === "random"
        ? selectWeightForSeed(state.activeSeed)
        : state.weight
      : undefined;

  state.pendingStat = null;
  state.history = [];
  state.result = null;
  state.drawBuffer = [];
  state.seedMessage = "";

  clearSavedMatch();
  persistPreferences(state);

  await draw(state, deps, operationId);
}

/**
 * Draw initial match fighters
 * Called after match setup, handles loading and error states
 */
export async function draw(state: GameState, deps: OrchestratorDeps, operationId = beginOperation(state)): Promise<void> {
  state.busy = true;
  state.result = null;
  state.errorMessage = "";
  deps.render();

  try {
    // A setup change or a newer draw must not alter the request already in flight.
    const seed = state.activeSeed;
    const target = state.target;
    const mode = state.mode;
    const activeWeight = state.activeWeight;
    const operationState = { ...state, activeWeight };
    const drawn = await drawBatch(seed, DRAW_BUFFER_SIZE, 2, operationState, deps.client);
    if (!isCurrentOperation(state, operationId)) return;
    const [a, b, ...remaining] = drawn;
    state.match = createMatch(a!, b!, target, 1, { player: 0, opponent: 0 }, mode);
    state.drawBuffer = remaining;
    saveGameState(state);
  } catch (e) {
    if (!isCurrentOperation(state, operationId)) return;
    state.match = null;
    state.drawBuffer = [];
    state.errorMessage =
      e instanceof Error && e.message.startsWith("No compatible")
        ? `${e.message}. Choose Absolute or another division.`
        : e instanceof Error
          ? `${e.message}. Check your connection and try again.`
          : "Unable to draw judoka. Please try again.";
  } finally {
    if (isCurrentOperation(state, operationId)) {
      state.busy = false;
      deps.render();
      if (state.match) deps.onMatchReady?.();
    }
  }
}

/**
 * Advance to next round
 * For champion mode: keeps player, draws new opponent
 * For classic mode: draws two new fighters
 */
export async function next(state: GameState, match: Match, deps: OrchestratorDeps): Promise<void> {
  if (state.busy || state.match !== match || match.phase !== "awaitingNext") return;

  state.busy = true;
  state.result = null;
  state.errorMessage = "";
  deps.render();

  try {
    const matchSeed = `${state.activeSeed}:buffer:${match.matchNumber + 1}`;

    let drawBuffer = [...state.drawBuffer];

    if (match.mode === "champion") {
      if (!drawBuffer.length)
        drawBuffer = [...await drawBatch(matchSeed, DRAW_BUFFER_SIZE - 1, 1, state, deps.client, [
          match.player.id,
          match.opponent.id
        ])];
      state.match = nextMatch(match, match.player, drawBuffer.shift()!);
    } else {
      if (drawBuffer.length < 2)
        drawBuffer = [...await drawBatch(matchSeed, DRAW_BUFFER_SIZE, 2, state, deps.client)];
      state.match = nextMatch(match, drawBuffer.shift()!, drawBuffer.shift()!);
    }

    state.drawBuffer = drawBuffer;
    saveGameState(state);
  } catch (e) {
    state.errorMessage =
      e instanceof Error
        ? `${e.message}. Try the next match again.`
        : "Unable to draw judoka. Please try again.";
    saveGameState(state);
  } finally {
    state.busy = false;
    deps.render();
  }
}

/**
 * Resolve a stat selection
 * Applies 650ms delay for opponent animation, then calculates result
 */
export function resolve(state: GameState, _match: Match, stat: StatKey, deps: OrchestratorDeps): void {
  if (!state.match || state.match.phase !== "selecting" || state.pendingStat) return;

  state.pendingStat = stat;
  deps.render();

  window.setTimeout(() => {
    if (!state.match || state.pendingStat !== stat) return;

    state.result = selectStat(state.match, stat);
    state.match = state.result.match;
    state.history.push({
      outcome: state.result.outcome,
      stat,
      roundNumber: state.match.matchNumber
    });

    state.pendingStat = null;
    outcomeBeep(state.result.outcome);
    saveGameState(state);
    deps.render();

    // Focus next/replay button for keyboard navigation
    const root = document.querySelector<HTMLDivElement>("#app");
    root?.querySelector<HTMLButtonElement>("#next, #replay")?.focus();
  }, MATCH_RESOLUTION_DELAY_MS);
}

/**
 * Copy the current replay seed to clipboard
 * Updates seedMessage for user feedback
 */
export async function copyReplaySeed(state: GameState, deps: OrchestratorDeps): Promise<void> {
  try {
    await navigator.clipboard.writeText(state.activeSeed);
    state.seedMessage = "Replay seed copied.";
  } catch {
    state.seedMessage = `Could not copy the replay seed "${state.activeSeed}". Copy manually.`;
  }
  deps.render();
}

/**
 * Clear game state and return to intro
 * Used when user quits or changes settings
 */
export function clearAndExit(state: GameState, deps: OrchestratorDeps): void {
  beginOperation(state);
  state.busy = false;
  state.match = null;
  state.result = null;
  state.pendingStat = null;
  state.errorMessage = "";
  state.history = [];
  state.drawBuffer = [];
  state.setupStep = "mode";
  clearSavedMatch();
  deps.render();
}

/**
 * Update match length selection
 * Called when user selects match length in intro
 */
export function chooseLength(state: GameState, n: number, deps: OrchestratorDeps): void {
  state.target = n;
  state.lengthIndex = lengths.indexOf(n as (typeof lengths)[number]);
  deps.render();
  document.querySelector<HTMLInputElement>(`[data-length="${n}"]`)?.focus();
}
