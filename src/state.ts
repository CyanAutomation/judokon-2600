import type { Judoka } from "./api/types";
import type { GameMode, Match, MatchResult } from "./game/game";
import { parseSavedMatch, stringifySavedMatch } from "./game/session";

const SAVED_MATCH_KEY = "judokon.activeMatch.v1";

export type Division = "absolute" | "weight";
export type SetupStep = "mode" | "division" | "weight" | "length";
export type History = Pick<MatchResult, "outcome" | "stat"> & { roundNumber: number };

/**
 * Game state container - holds all game state in one place
 */
export interface GameState {
  match: Match | null;
  result: MatchResult | null;
  pendingStat: string | null;
  activeSeed: string;
  activeWeight: string | undefined;
  drawBuffer: Judoka[];
  target: number;
  lengthIndex: number;
  busy: boolean;
  errorMessage: string;
  history: History[];
  division: Division;
  mode: GameMode;
  weight: string;
  replaySeed: string;
  seedMessage: string;
  /** The active stage of the compact pre-match setup flow. */
  setupStep?: SetupStep;
}

/**
 * Create initial game state
 */
export function createGameState(): GameState {
  const division: Division = localStorage.getItem("judokon.divisionMode") === "weight" ? "weight" : "absolute";
  const mode: GameMode = localStorage.getItem("judokon.gameMode") === "champion" ? "champion" : "classic";
  const weight = localStorage.getItem("judokon.weightClass") ?? "random";

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
    division,
    mode,
    weight,
    replaySeed: "",
    seedMessage: "",
    setupStep: "mode",
  };
}

/**
 * Persist user preferences to localStorage
 */
export function persistPreferences(state: GameState): void {
  localStorage.setItem("judokon.divisionMode", state.division);
  localStorage.setItem("judokon.gameMode", state.mode);
  localStorage.setItem("judokon.weightClass", state.weight);
}

/**
 * Clear saved match from sessionStorage
 */
export function clearSavedMatch(): void {
  sessionStorage.removeItem(SAVED_MATCH_KEY);
}

/**
 * Save current game state to sessionStorage
 */
export function saveGameState(state: GameState): void {
  if (!state.match || state.pendingStat) return;
  sessionStorage.setItem(
    SAVED_MATCH_KEY,
    stringifySavedMatch({
      version: 1,
      match: state.match,
      result: state.result,
      history: state.history,
      activeSeed: state.activeSeed,
      activeWeight: state.activeWeight,
      drawBuffer: state.drawBuffer,
    })
  );
}

/**
 * Load saved game state from sessionStorage
 */
export function loadSavedGameState(): Partial<GameState> | null {
  const saved = parseSavedMatch(sessionStorage.getItem(SAVED_MATCH_KEY));
  if (!saved) return null;

  return {
    match: saved.match,
    result: saved.result,
    history: saved.history,
    activeSeed: saved.activeSeed,
    activeWeight: saved.activeWeight,
    drawBuffer: saved.drawBuffer,
  };
}
