import "./style.css";
import { injectSpeedInsights } from "@vercel/speed-insights";
import { BudokonClient } from "./api/budokon";
import { handleClickEvent, handleChangeEvent, handleToggleEvent, handleIntroKeyboard, handleMatchKeyboard } from "./ui/eventHandlers";
import { initAudio, keyboardTick, setSoundEnabled } from "./audio";
import { createGameState, loadSavedGameState, persistPreferences, type GameState } from "./state";
import { renderApp } from "./ui/render";
import { start, next, resolve, copyReplaySeed, clearAndExit, chooseLength, type OrchestratorDeps } from "./game/orchestrator";

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

const deps: OrchestratorDeps = { client, render };

function render(): void {
  renderApp(root, state);
}
root.addEventListener("click", (e) => {
  handleClickEvent(e, state, {
    start: () => { start(state, deps); },
    copyReplaySeed: () => copyReplaySeed(state, deps),
    next: (m) => next(state, m, deps),
    resolve: (stat) => resolve(state, state.match!, stat, deps),
    clearAndExit: () => clearAndExit(state, deps)
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

root.addEventListener("toggle", handleToggleEvent, true);

document.addEventListener("keydown", (e) => {
  if ((e.target as HTMLElement).matches("input, select")) return;
  if (/^[1-5]$/.test(e.key) || ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Enter", " ", "Escape"].includes(e.key) || ["a", "w", "c", "h", "q"].includes(e.key.toLowerCase())) keyboardTick();

  if (!state.match) {
    handleIntroKeyboard(e, state, root, {
      choose: (n) => chooseLength(state, n, deps),
      start: () => { start(state, deps); },
      keyboardTick
    });
  } else {
    handleMatchKeyboard(e, state, root, {
      resolve: (stat) => resolve(state, state.match!, stat, deps),
      keyboardTick
    });
  }
});

render();
