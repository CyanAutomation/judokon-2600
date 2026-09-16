/**
 * Keyboard Event Handlers
 * 
 * Handles keyboard input during setup (intro) and match phases.
 * Supports navigation, selection, and action shortcuts.
 */

import type { GameState } from "../state";
import type { StatKey } from "../api/types";
import { STAT_KEYS } from "../api/types";
import type { SetupStep } from "../state";

const LENGTHS = [3, 5, 10] as const;

/**
 * Handle keyboard input for mode selection step
 */
function handleModeSelection(
  e: KeyboardEvent,
  root: HTMLElement,
  currentCursor: number,
  handlers: { moveCursor?: (cursor: number) => void }
): boolean {
  if (e.key === "ArrowUp" || e.key === "ArrowDown") {
    e.preventDefault();
    const direction = e.key === "ArrowUp" ? -1 : 1;
    handlers.moveCursor?.((currentCursor + 2 + direction) % 2);
    return true;
  }

  if (e.key.toLowerCase() === "c" || e.key.toLowerCase() === "h") {
    e.preventDefault();
    root.querySelector<HTMLInputElement>(`[data-intro-mode="${e.key.toLowerCase() === "h" ? "champion" : "classic"}"]`)?.click();
    return true;
  }

  if (e.key === "Enter" || e.key === " ") {
    e.preventDefault();
    root.querySelectorAll<HTMLInputElement>("[data-intro-mode]")[currentCursor]?.click();
    return true;
  }

  return false;
}

/**
 * Handle keyboard input for division selection step
 */
function handleDivisionSelection(
  e: KeyboardEvent,
  root: HTMLElement,
  currentCursor: number,
  handlers: { moveCursor?: (cursor: number) => void }
): boolean {
  if (e.key === "ArrowUp" || e.key === "ArrowDown") {
    e.preventDefault();
    const direction = e.key === "ArrowUp" ? -1 : 1;
    handlers.moveCursor?.((currentCursor + 2 + direction) % 2);
    return true;
  }

  if (e.key.toLowerCase() === "a" || e.key.toLowerCase() === "w") {
    e.preventDefault();
    root.querySelector<HTMLInputElement>(`[data-division="${e.key.toLowerCase() === "w" ? "weight" : "absolute"}"]`)?.click();
    return true;
  }

  if (e.key === "Enter" || e.key === " ") {
    e.preventDefault();
    root.querySelectorAll<HTMLInputElement>("[data-division]")[currentCursor]?.click();
    return true;
  }

  return false;
}

/**
 * Handle keyboard input for weight selection step
 */
function handleWeightSelection(e: KeyboardEvent, root: HTMLElement): boolean {
  if (e.key === "Enter" || e.key === " ") {
    e.preventDefault();
    root.querySelector<HTMLButtonElement>("#confirm-weight")?.click();
    return true;
  }

  return false;
}

/**
 * Handle keyboard input for length selection step
 */
function handleLengthSelection(
  e: KeyboardEvent,
  state: GameState,
  handlers: { choose: (n: number) => void; start: () => void }
): boolean {
  if (e.key >= "1" && e.key <= "3") {
    e.preventDefault();
    handlers.choose(LENGTHS[Number(e.key) - 1]!);
    return true;
  }

  if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
    e.preventDefault();
    handlers.choose(LENGTHS[(state.lengthIndex + LENGTHS.length - 1) % LENGTHS.length]!);
    return true;
  }

  if (e.key === "ArrowRight" || e.key === "ArrowDown") {
    e.preventDefault();
    handlers.choose(LENGTHS[(state.lengthIndex + 1) % LENGTHS.length]!);
    return true;
  }

  if (e.key === "Enter" || e.key === " ") {
    e.preventDefault();
    if (!state.busy) handlers.start();
    return true;
  }

  return false;
}

/**
 * Handles keyboard events during intro screen.
 * Supports: number keys for length, A/W for division, C/H for mode, arrows for cycling, Enter to start.
 */
export function handleIntroKeyboard(
  e: KeyboardEvent,
  state: GameState,
  root: HTMLElement,
  handlers: { choose: (n: number) => void; start: () => void; keyboardTick: () => void; moveCursor?: (cursor: number) => void }
): void {
  const step = (state.setupStep ?? "mode") as SetupStep;
  const currentCursor = state.setupCursor ?? (step === "length" ? state.lengthIndex : 0);

  // Dispatch to step-specific handler
  switch (step) {
    case "mode":
      handleModeSelection(e, root, currentCursor, handlers);
      break;
    case "division":
      handleDivisionSelection(e, root, currentCursor, handlers);
      break;
    case "weight":
      handleWeightSelection(e, root);
      break;
    case "length":
      handleLengthSelection(e, state, handlers);
      break;
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

  if ((e.key === "Enter" || e.key === " ") && phase === "awaitingNext" && !state.busy) {
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
