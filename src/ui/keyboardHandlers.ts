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

import { lengths } from "./helpers";

/**
 * Configuration for a cursor-based step handler
 */
interface CursorStepConfig {
  optionCount: number;
  dataAttribute: string;
  keyMap?: Record<string, string>; // Maps key to data attribute value
  optionSelector: string;
}

/**
 * Factory function to create cursor-based step handlers (e.g., mode, division selection)
 * Handles arrow keys for cursor movement, optional key shortcuts for direct selection,
 * and Enter/Space to confirm selection.
 */
function createCursorStepHandler(
  config: CursorStepConfig
): (e: KeyboardEvent, root: HTMLElement, currentCursor: number, handlers: { moveCursor?: (cursor: number) => void }) => boolean {
  return (e: KeyboardEvent, root: HTMLElement, currentCursor: number, handlers: { moveCursor?: (cursor: number) => void }): boolean => {
    // Handle arrow key cursor movement
    if (e.key === "ArrowUp" || e.key === "ArrowDown") {
      e.preventDefault();
      const direction = e.key === "ArrowUp" ? -1 : 1;
      handlers.moveCursor?.((currentCursor + config.optionCount + direction) % config.optionCount);
      return true;
    }

    // Handle key shortcuts (if defined)
    if (config.keyMap) {
      const lowerKey = e.key.toLowerCase();
      const dataValue = config.keyMap[lowerKey];
      if (dataValue) {
        e.preventDefault();
        root.querySelector<HTMLInputElement>(`[${config.dataAttribute}="${dataValue}"]`)?.click();
        return true;
      }
    }

    // Handle Enter/Space to confirm
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      root.querySelectorAll<HTMLInputElement>(config.optionSelector)[currentCursor]?.click();
      return true;
    }

    return false;
  };
}

/**
 * Handle keyboard input for mode selection step
 */
const handleModeSelection = createCursorStepHandler({
  optionCount: 2,
  dataAttribute: "data-intro-mode",
  keyMap: {
    "c": "classic",
    "h": "champion"
  },
  optionSelector: "[data-intro-mode]"
});

/**
 * Handle keyboard input for division selection step
 */
const handleDivisionSelection = createCursorStepHandler({
  optionCount: 2,
  dataAttribute: "data-division",
  keyMap: {
    "a": "absolute",
    "w": "weight"
  },
  optionSelector: "[data-division]"
});

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
 * Handle numeric shortcut keys (1-3) for length selection
 */
function handleLengthNumericKey(e: KeyboardEvent, handlers: { choose: (n: number) => void }): boolean {
  if (e.key >= "1" && e.key <= "3") {
    e.preventDefault();
    handlers.choose(lengths[Number(e.key) - 1]!);
    return true;
  }
  return false;
}

/**
 * Handle arrow key navigation for length selection
 */
function handleLengthArrowKey(
  e: KeyboardEvent,
  state: GameState,
  handlers: { choose: (n: number) => void }
): boolean {
  if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
    e.preventDefault();
    handlers.choose(lengths[(state.lengthIndex + lengths.length - 1) % lengths.length]!);
    return true;
  }

  if (e.key === "ArrowRight" || e.key === "ArrowDown") {
    e.preventDefault();
    handlers.choose(lengths[(state.lengthIndex + 1) % lengths.length]!);
    return true;
  }

  return false;
}

/**
 * Handle length selection step
 */
function handleLengthSelection(
  e: KeyboardEvent,
  state: GameState,
  handlers: { choose: (n: number) => void; start: () => void }
): boolean {
  if (handleLengthNumericKey(e, handlers)) return true;
  if (handleLengthArrowKey(e, state, handlers)) return true;

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
 * Handle numeric stat selection (1-5) during stat selection phase
 */
function handleStatSelection(e: KeyboardEvent, handlers: { resolve: (s: StatKey) => void }): boolean {
  if (e.key >= "1" && e.key <= "5") {
    handlers.resolve(STAT_KEYS[Number(e.key) - 1]!);
    return true;
  }
  return false;
}

/**
 * Handle next round action during awaiting-next phase
 */
function handleNextRound(e: KeyboardEvent, root: HTMLElement, state: GameState): boolean {
  if ((e.key === "Enter" || e.key === " ") && !state.busy) {
    e.preventDefault();
    root.querySelector<HTMLButtonElement>("#next")?.click();
    return true;
  }
  return false;
}

/**
 * Handle replay action during match-over phase
 */
function handleReplay(e: KeyboardEvent, root: HTMLElement): boolean {
  if (e.key === "Enter" || e.key === " ") {
    e.preventDefault();
    root.querySelector<HTMLButtonElement>("#replay")?.click();
    return true;
  }
  return false;
}

/**
 * Handle quit action (available in any phase)
 */
function handleQuitMatch(e: KeyboardEvent, root: HTMLElement): boolean {
  if (e.key.toLowerCase() === "q" || e.key === "Escape") {
    root.querySelector<HTMLButtonElement>("#quit")?.click();
    return true;
  }
  return false;
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

  // Handle quit (works in any phase)
  if (handleQuitMatch(e, root)) return;

  // Handle phase-specific actions
  switch (phase) {
    case "selecting":
      handleStatSelection(e, handlers);
      break;
    case "awaitingNext":
      handleNextRound(e, root, state);
      break;
    case "matchOver":
      handleReplay(e, root);
      break;
  }
}
