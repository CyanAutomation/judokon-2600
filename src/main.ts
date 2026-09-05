import "./style.css";
import { BudokonClient } from "./api/budokon";
import { shortcutHint } from "./ui/controls";
import { handleClickEvent, handleChangeEvent, handleToggleEvent, handleIntroKeyboard, handleMatchKeyboard } from "./ui/eventHandlers";
import { initAudio, keyboardTick, setSoundEnabled } from "./audio";
import { createGameState, loadSavedGameState, persistPreferences, type GameState } from "./state";
import { createHelpers, status, intro, game, headerContext } from "./ui/templates";
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

const deps: OrchestratorDeps = { client, render };

function render(): void {
  const helpers = createHelpers(state);
  const hint = !state.match
    ? `${shortcutHint("A / W")} Division ${shortcutHint("1–3")} Length ${shortcutHint("Enter")} Start`
    : state.pendingStat
      ? "Resolving opponent…"
      : state.match.phase === "selecting"
        ? `${shortcutHint("1–5")} Choose a stat ${shortcutHint("Esc / Q")} Quit match`
        : state.match.phase === "awaitingNext"
          ? `${shortcutHint("Enter")} Next round ${shortcutHint("Esc / Q")} Quit match`
          : `${shortcutHint("Enter")} Play again ${shortcutHint("Esc / Q")} Change settings`;
  const content = !state.match
    ? intro(state, helpers)
    : `<p id="status" class="active-command" role="status" aria-live="polite">${status(state)} <span class="block-cursor" aria-hidden="true">█</span></p>${game(state.match, state, helpers)}`;
  root.innerHTML = `<header><div>bash - JU-DO-KON</div><p>${headerContext(state, helpers)}</p></header><main id="game" tabindex="-1" class="${!state.match ? "intro-main" : ""}">${content}</main><footer><span class="footer-hint">${hint}</span></footer>`;
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
