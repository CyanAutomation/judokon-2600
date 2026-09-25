import "./style.css";
import { injectSpeedInsights } from "@vercel/speed-insights";
import { BudokonClient } from "./api/budokon";
import type { StatKey } from "./api/types";
import { handleClickEvent, handleChangeEvent, handleIntroKeyboard, handleMatchKeyboard } from "./ui/eventHandlers";
import type { SetupStep } from "./state";
import { initAudio, keyboardTick, setSoundEnabled } from "./audio";
import { createGameState, loadSavedGameState, persistPreferences, type GameState } from "./state";
import { renderApp } from "./ui/render";
import type { Match } from "./game/game";
import { start, next, resolve, copyReplaySeed, clearAndExit, chooseLength, handleSetupStepClick, handleOpenSeedModal, handleCloseSeedModal, handleSaveReplaySeed, handleToggleSound, handleKeyboardMoveCursor, handleKeyboardCloseSeedModal, type OrchestratorDeps } from "./game/orchestrator";
import { isSeedModalEscape, shouldHandleKeyboardEvent, shouldPlayKeyboardTick } from "./ui/keyboardGuards";
import { getSoundEnabled } from "./ui/helpers/soundStorage";

const app = document.querySelector<HTMLDivElement>("#app");
if (!app) throw new Error("Application root is missing");
const root = app;
const client = new BudokonClient();

// Initialize game state from localStorage and sessionStorage
const state: GameState = createGameState();
const savedMatch = loadSavedGameState();
if (savedMatch) {
  state.match = savedMatch.match ?? null;
  state.result = savedMatch.result ?? null;
  state.history = savedMatch.history ?? [];
  state.activeSeed = savedMatch.activeSeed ?? "";
  state.activeWeight = savedMatch.activeWeight;
  state.drawBuffer = savedMatch.drawBuffer ?? [];
}

// Initialize audio system
initAudio(getSoundEnabled());

// Initialize Vercel Speed Insights
injectSpeedInsights();

function render(): void {
  renderApp(root, state);
}

const deps: OrchestratorDeps = {
  client,
  render,
  onMatchReady: () => {
    const game = root.querySelector<HTMLElement>("#game");
    game?.focus();
    game?.scrollIntoView({ block: "start" });
  }
};

/**
 * Create handlers object for click events
 */
function createClickHandlers() {
  return {
    start: () => { start(state, deps); },
    copyReplaySeed: () => copyReplaySeed(state, deps),
    next: (m: Match) => next(state, m, deps),
    resolve: (stat: StatKey) => resolve(state, state.match!, stat, deps),
    clearAndExit: () => clearAndExit(state, deps),
    setSetupStep: (setupStep: SetupStep) => handleSetupStepClick(state, setupStep, deps),
    openSeedModal: () => handleOpenSeedModal(state, deps),
    closeSeedModal: () => handleCloseSeedModal(state, deps),
    saveReplaySeed: (seed: string) => handleSaveReplaySeed(state, seed, deps),
    toggleSound: () => handleToggleSound(setSoundEnabled, deps)
  };
}

/**
 * Create handlers object for change events
 */
function createChangeHandlers() {
  return {
    render,
    persistPreferences: () => persistPreferences(state),
    setSoundEnabled
  };
}

/**
 * Create handlers object for intro keyboard events
 */
function createIntroKeyboardHandlers() {
  return {
    choose: (n: number) => {
      state.setupCursor = [3, 5, 10].indexOf(n);
      chooseLength(state, n, deps);
    },
    start: () => { if (!state.busy) void start(state, deps); },
    keyboardTick,
    moveCursor: (cursor: number) => handleKeyboardMoveCursor(state, cursor, deps)
  };
}

/**
 * Create handlers object for match keyboard events
 */
function createMatchKeyboardHandlers() {
  return {
    resolve: (stat: StatKey) => resolve(state, state.match!, stat, deps),
    keyboardTick
  };
}
/**
 * Handle escape key press in seed modal
 */
function handleSeedModalEscape(e: KeyboardEvent): void {
  e.preventDefault();
  handleKeyboardCloseSeedModal(state, deps);
}

/**
 * Handle keyboard events with branching logic
 */
function handleKeyboardEvent(e: KeyboardEvent): void {
  // Handle escape in seed modal
  if (isSeedModalEscape(e, state)) {
    handleSeedModalEscape(e);
    return;
  }

  // Let editable inputs handle their own keys
  if (!shouldHandleKeyboardEvent(e)) return;

  // Play keyboard tick for navigation keys
  if (shouldPlayKeyboardTick(e.key)) keyboardTick();

  // Dispatch to appropriate handler
  if (state.match) {
    const handlers = createMatchKeyboardHandlers();
    handleMatchKeyboard(e, state, root, handlers);
  } else {
    const handlers = createIntroKeyboardHandlers();
    handleIntroKeyboard(e, state, root, handlers);
  }
}

// Event listeners
root.addEventListener("click", (e) => {
  handleClickEvent(e, state, createClickHandlers());
});

root.addEventListener("change", (e) => {
  handleChangeEvent(e, state, root, createChangeHandlers());

  const input = e.target as HTMLInputElement;
  if (input.dataset.length && input.checked) {
    chooseLength(state, Number(input.dataset.length), deps);
  }
});

document.addEventListener("keydown", handleKeyboardEvent);

render();
