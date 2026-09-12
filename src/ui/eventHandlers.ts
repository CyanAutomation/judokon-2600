import type { GameState, SetupStep } from "../state";
import type { Match } from "../game/game";
import type { StatKey } from "../api/types";
import { STAT_KEYS } from "../api/types";

/**
 * Handles click events on buttons throughout the application.
 * Routes button clicks to appropriate handlers (start, next, stat selection, etc.).
 */
export function handleClickEvent(
  e: MouseEvent,
  state: GameState,
  handlers: { start: () => void; copyReplaySeed: () => Promise<void>; next: (m: Match) => Promise<void>; resolve: (s: StatKey) => void; clearAndExit: () => void; setSetupStep?: (step: SetupStep) => void }
): void {
  const b = (e.target as Element).closest<HTMLButtonElement>("button");
  if (!b || b.disabled) return;

  if (b.dataset.setupStep) {
    handlers.setSetupStep?.(b.dataset.setupStep as SetupStep);
  } else if (b.id === "confirm-weight") {
    handlers.setSetupStep?.("length");
  } else if (b.id === "start" || b.id === "retry") {
    handlers.start();
  } else if (b.id === "replay") {
    handlers.start();
  } else if (b.id === "copy-seed") {
    void handlers.copyReplaySeed();
  } else if (b.dataset.stat) {
    handlers.resolve(b.dataset.stat as StatKey);
  } else if (b.id === "next" && state.match) {
    void handlers.next(state.match);
  } else if (b.id === "quit") {
    handlers.clearAndExit();
  }
}

/**
 * Handles input change events (radio buttons, selects, checkboxes).
 * Routes to appropriate handlers based on data attributes and input IDs.
 */
export function handleChangeEvent(
  e: Event,
  state: GameState,
  root: HTMLElement,
  onUpdate: { render: () => void; persistPreferences: () => void; setSoundEnabled: (enabled: boolean) => void }
): void {
  const input = e.target as HTMLInputElement;

  if (input.dataset.division && input.checked) {
    state.division = input.dataset.division === "weight" ? "weight" : "absolute";
    state.setupStep = state.division === "weight" ? "weight" : "length";
    onUpdate.persistPreferences();
    onUpdate.render();
    root.querySelector<HTMLElement>(state.division === "weight" ? "#weight-class" : "#length-3")?.focus();
    return;
  }

  if (input.dataset.introMode && input.checked) {
    state.mode = input.dataset.introMode === "champion" ? "champion" : "classic";
    state.setupStep = "division";
    onUpdate.persistPreferences();
    onUpdate.render();
    root.querySelector<HTMLInputElement>("#division-absolute")?.focus();
    return;
  }

  if (input.dataset.length && input.checked) {
    // Handled by separate choose() function call
    return;
  }

  if (input.id === "replay-seed") {
    state.replaySeed = input.value;
    return;
  }

  if (input.id === "weight-class") {
    state.weight = input.value;
  }

  if (input.id === "sound-enabled") {
    onUpdate.setSoundEnabled(input.checked);
    localStorage.setItem("judokon.soundEnabled", String(input.checked));
  }

  onUpdate.persistPreferences();
  onUpdate.render();
}

/**
 * Handles toggle events on disclosure/details elements.
 * Updates accessibility labels and visibility state indicators.
 */
export function handleToggleEvent(e: Event): void {
  const details = e.target;
  if (!(details instanceof HTMLDetailsElement) || !details.matches(".advanced")) return;

  const summary = details.querySelector("summary");
  const state = details.querySelector(".disclosure-state");

  if (summary) {
    summary.setAttribute("aria-label", `${details.open ? "Hide" : "Show"} advanced options`);
  }
  if (state) {
    state.textContent = details.open ? "Hide" : "Show";
  }
}

/**
 * Handles keyboard events during intro screen.
 * Supports: number keys for length, A/W for division, C/H for mode, arrows for cycling, Enter to start.
 */
export function handleIntroKeyboard(
  e: KeyboardEvent,
  state: GameState,
  root: HTMLElement,
  handlers: { choose: (n: number) => void; start: () => void; keyboardTick: () => void }
): void {
  const lengths = [3, 5, 10] as const;
  const step = state.setupStep ?? "mode";

  if (step === "length" && e.key >= "1" && e.key <= "3") {
    e.preventDefault();
    handlers.choose(lengths[Number(e.key) - 1]!);
  } else if (step === "division" && (e.key.toLowerCase() === "a" || e.key.toLowerCase() === "w")) {
    e.preventDefault();
    root.querySelector<HTMLInputElement>(`[data-division="${e.key.toLowerCase() === "w" ? "weight" : "absolute"}"]`)?.click();
  } else if (step === "mode" && (e.key.toLowerCase() === "c" || e.key.toLowerCase() === "h")) {
    e.preventDefault();
    root.querySelector<HTMLInputElement>(`[data-intro-mode="${e.key.toLowerCase() === "h" ? "champion" : "classic"}"]`)?.click();
  } else if (step === "length" && (e.key === "ArrowLeft" || e.key === "ArrowUp")) {
    e.preventDefault();
    handlers.choose(lengths[(state.lengthIndex + lengths.length - 1) % lengths.length]!);
  } else if (step === "length" && (e.key === "ArrowRight" || e.key === "ArrowDown")) {
    e.preventDefault();
    handlers.choose(lengths[(state.lengthIndex + 1) % lengths.length]!);
  } else if (step === "weight" && (e.key === "Enter" || e.key === " ")) {
    e.preventDefault();
    root.querySelector<HTMLButtonElement>("#confirm-weight")?.click();
  } else if (step === "length" && (e.key === "Enter" || e.key === " ")) {
    e.preventDefault();
    handlers.start();
  }
}

/**
 * Handles keyboard input during an active match.
 * Supports: numbered keys for stat selection (1-5), Enter for next round, Escape/Q to quit.
 */
export function handleMatchKeyboard(
  e: KeyboardEvent,
  state: GameState,
  root: HTMLElement,
  handlers: { resolve: (s: StatKey) => void; keyboardTick: () => void }
): void {
  if (!state.match) return;
  const { phase } = state.match;

  if (e.key >= "1" && e.key <= "5" && phase === "selecting") {
    handlers.resolve(STAT_KEYS[Number(e.key) - 1]!);
  }

  if ((e.key === "Enter" || e.key === " ") && phase === "awaitingNext") {
    e.preventDefault();
    root.querySelector<HTMLButtonElement>("#next")?.click();
  }

  if ((e.key === "Enter" || e.key === " ") && phase === "matchOver") {
    e.preventDefault();
    root.querySelector<HTMLButtonElement>("#replay")?.click();
  }

  if (e.key.toLowerCase() === "q" || e.key === "Escape") {
    root.querySelector<HTMLButtonElement>("#quit")?.click();
  }
}
