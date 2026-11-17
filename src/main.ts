import "./style.css";
import { createSnackbar } from "./ui/snackbar";
import type { NoticeDuration } from "./ui/noticeTypes";
import { layoutSetupActions } from "./ui/layout";
import { matchBreakdownContent } from "./ui/match-templates";
import { lengths } from "./ui/constants";
import { injectSpeedInsights } from "@vercel/speed-insights";
import { BudokonClient } from "./api/budokon";
import type { StatKey } from "./api/types";
import { handleClickEvent, handleChangeEvent, handleIntroKeyboard, handleMatchKeyboard } from "./ui/eventHandlers";
import type { SetupStep } from "./state";
import { initAudio, keyboardTick, setSoundEnabled } from "./audio";
import { createGameState, loadSavedGameState, persistPreferences, type GameState } from "./state";
import { renderApp } from "./ui/render";
import { status } from "./ui/helpers/status";
import { createStatusAnnouncer } from "./ui/statusAnnouncer";
import type { Match } from "./game/game";
import { start, next, resolve, copyReplaySeed, clearAndExit, requestQuit, chooseLength, handleSetupStepClick, handleOpenSeedModal, handleCloseSeedModal, handleSaveReplaySeed, handleToggleSound, handleKeyboardMoveCursor, handleKeyboardCloseSeedModal, type OrchestratorDeps } from "./game/orchestrator";
import { handleGlobalKeyboardEvent } from "./ui/keyboardEventDispatcher";
import { getSoundEnabled } from "./ui/helpers/soundStorage";
import { requestTacticalAssessment } from "./api/tacticalAssessment";
import { registerAppServiceWorker } from "./pwa/registerServiceWorker";

const app = document.querySelector<HTMLDivElement>("#app");
if (!app) throw new Error("Application root is missing");
const root = app;
const notificationHost = document.createElement("div");
notificationHost.id = "notifications";
root.after(notificationHost);
const notifications = createSnackbar(notificationHost);

function fitViewport(): void {
  document.documentElement.style.setProperty("--viewport-height", `${window.visualViewport?.height ?? window.innerHeight}px`);
  layoutSetupActions(root);
}
window.addEventListener("resize", fitViewport);
window.visualViewport?.addEventListener("resize", fitViewport);
fitViewport();
const client = new BudokonClient();

declare global {
  interface Window {
    judokonCacheStats?: () => ReturnType<BudokonClient["getCacheStats"]>;
  }
}

window.judokonCacheStats = () => client.getCacheStats();

// Initialize game state from localStorage and sessionStorage
const state: GameState = createGameState();
const announceStatusChange = createStatusAnnouncer(message => notifications.announce(message), status(state));
let waitingWorker: ServiceWorker | null = null;
let updateNoticeShown = false;
let updateReloadRequested = false;
let updateReloadStarted = false;
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
  notifications.setSuspended(Boolean(state.seedModalOpen));
  announceStatusChange(status(state));
  showPendingUpdateIfSafe();
}

function showPendingUpdateIfSafe(): void {
  if (!waitingWorker || updateNoticeShown || (state.match && state.match.phase !== "matchOver")) return;
  updateNoticeShown = true;
  notifications.show({
    key: "app-update",
    message: "A new version is available.",
    duration: 8000,
    action: {
      label: "Reload",
      run: () => {
        if (!waitingWorker || updateReloadRequested) return;
        updateReloadRequested = true;
        waitingWorker.postMessage({ type: "SKIP_WAITING" });
      }
    }
  });
}

function handleUpdateControllerChange(): void {
  if (!updateReloadRequested || updateReloadStarted) return;
  updateReloadStarted = true;
  window.location.reload();
}

const deps: OrchestratorDeps = {
  client,
  render,
  assessTactics: requestTacticalAssessment,
  notify: notice => notifications.show(notice),
  clearNotices: () => notifications.clear(),
  renderTactical: () => {
    const region = root.querySelector<HTMLElement>(".post-match-summary");
    if (region && state.match) region.innerHTML = matchBreakdownContent(state.match, state);
  },
  viewTactics: () => {
    const breakdown = root.querySelector<HTMLDetailsElement>(".match-breakdown");
    if (breakdown) breakdown.open = true;
    const heading = root.querySelector<HTMLElement>("#dojo-notes-title");
    heading?.focus({ preventScroll: true });
    heading?.scrollIntoView({ block: "nearest" });
  },
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
    start: (seed?: string) => { void start(state, deps, state.target, seed); },
    copyReplaySeed: () => copyReplaySeed(state, deps),
    next: (m: Match) => next(state, m, deps),
    resolve: (stat: StatKey) => resolve(state, state.match!, stat, deps),
    clearAndExit: () => clearAndExit(state, deps),
    requestQuit: () => requestQuit(state, deps),
    setSetupStep: (setupStep: SetupStep) => handleSetupStepClick(state, setupStep, deps),
    openSeedModal: () => handleOpenSeedModal(state, deps),
    closeSeedModal: () => handleCloseSeedModal(state, deps),
    saveReplaySeed: (seed: string) => handleSaveReplaySeed(state, seed, deps),
    toggleSound: () => handleToggleSound(setSoundEnabled, deps),
    startWithLength: (points: number) => { if (!state.busy) void start(state, deps, points); }
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
      state.setupCursor = lengths.indexOf(n as (typeof lengths)[number]);
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
 * Handle keyboard events with branching logic
 */
function handleKeyboardEvent(e: KeyboardEvent): void {
  handleGlobalKeyboardEvent(e, state, {
    closeSeedModal: () => handleKeyboardCloseSeedModal(state, deps),
    keyboardTick,
    handleMatch: (event) => handleMatchKeyboard(event, state, root, createMatchKeyboardHandlers()),
    handleIntro: (event) => handleIntroKeyboard(event, state, root, createIntroKeyboardHandlers())
  });
}

// Event listeners
root.addEventListener("click", (e) => {
  handleClickEvent(e, state, createClickHandlers());
});

root.addEventListener("change", (e) => {
  const setting = e.target as HTMLSelectElement;
  if (setting.id === "notice-duration") {
    notifications.setDuration(setting.value as NoticeDuration);
    return;
  }
  handleChangeEvent(e, state, root, createChangeHandlers());

  const input = e.target as HTMLInputElement;
  if (input.dataset.length && input.checked) {
    chooseLength(state, Number(input.dataset.length), deps);
  }
});

document.addEventListener("keydown", handleKeyboardEvent);

render();
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.addEventListener("controllerchange", handleUpdateControllerChange);
  void registerAppServiceWorker(worker => {
    waitingWorker = worker;
    updateNoticeShown = false;
    updateReloadRequested = false;
    updateReloadStarted = false;
    showPendingUpdateIfSafe();
  });
}
if (savedMatch && state.match) {
  notifications.show({ key: "restored", message: `Match restored — round ${state.match.matchNumber}.`, duration: 6000 });
}
