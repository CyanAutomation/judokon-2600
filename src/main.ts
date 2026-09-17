import "./style.css";
import { injectSpeedInsights } from "@vercel/speed-insights";
import { BudokonClient } from "./api/budokon";
import { handleClickEvent, handleChangeEvent, handleIntroKeyboard, handleMatchKeyboard } from "./ui/eventHandlers";
import { initAudio, keyboardTick, setSoundEnabled } from "./audio";
import { createGameState, loadSavedGameState, persistPreferences, type GameState } from "./state";
import { renderApp } from "./ui/render";
import { start, next, resolve, copyReplaySeed, clearAndExit, chooseLength, handleSetupStepClick, handleOpenSeedModal, handleCloseSeedModal, handleSaveReplaySeed, handleToggleSound, handleKeyboardMoveCursor, handleKeyboardCloseSeedModal, type OrchestratorDeps } from "./game/orchestrator";

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
initAudio(localStorage.getItem("judokon.soundEnabled") === "true");

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
root.addEventListener("click", (e) => {
  handleClickEvent(e, state, {
    start: () => { start(state, deps); },
    copyReplaySeed: () => copyReplaySeed(state, deps),
    next: (m) => next(state, m, deps),
    resolve: (stat) => resolve(state, state.match!, stat, deps),
    clearAndExit: () => clearAndExit(state, deps),
    setSetupStep: (setupStep) => handleSetupStepClick(state, setupStep, deps),
    openSeedModal: () => handleOpenSeedModal(state, deps),
    closeSeedModal: () => handleCloseSeedModal(state, deps),
    saveReplaySeed: (seed) => handleSaveReplaySeed(state, seed, deps),
    toggleSound: () => handleToggleSound(setSoundEnabled, deps)
  });
});

root.addEventListener("change", (e) => {
  handleChangeEvent(e, state, root, {
    render,
    persistPreferences: () => persistPreferences(state),
    setSoundEnabled
  });

  const input = e.target as HTMLInputElement;
  if (input.dataset.length && input.checked) {
    chooseLength(state, Number(input.dataset.length), deps);
  }
});

document.addEventListener("keydown", (e) => {
  if (state.seedModalOpen && e.key === "Escape") {
    e.preventDefault();
    handleKeyboardCloseSeedModal(state, deps);
    return;
  }
  // Setup radios are a terminal menu: their arrows move the caret and Enter commits.
  // Text inputs and selects keep their native editing/navigation behaviour.
  if ((e.target as HTMLElement).matches("input:not(.choice-input), select")) return;
  if (/^[1-5]$/.test(e.key) || ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Enter", " ", "Escape"].includes(e.key) || ["a", "w", "c", "h", "q"].includes(e.key.toLowerCase())) keyboardTick();

  if (!state.match) {
    handleIntroKeyboard(e, state, root, {
      choose: (n) => {
        state.setupCursor = [3, 5, 10].indexOf(n);
        chooseLength(state, n, deps);
      },
      start: () => { if (!state.busy) void start(state, deps); },
      keyboardTick,
      moveCursor: (cursor) => handleKeyboardMoveCursor(state, cursor, deps)
    });
  } else {
    handleMatchKeyboard(e, state, root, {
      resolve: (stat) => resolve(state, state.match!, stat, deps),
      keyboardTick
    });
  }
});

render();
