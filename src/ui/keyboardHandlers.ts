/**
 * Keyboard Event Handlers
 * 
 * Handles keyboard input during setup (intro) and match phases.
 * Supports navigation, selection, and action shortcuts.
 */

import type { GameState } from "../state";
import type { StatKey } from "../api/types";
import { STAT_KEYS } from "../api/types";

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
  const lengths = [3, 5, 10] as const;
  const step = state.setupStep ?? "mode";
  const currentCursor = state.setupCursor ?? (step === "length" ? state.lengthIndex : 0);

  if ((step === "mode" || step === "division") && (e.key === "ArrowUp" || e.key === "ArrowDown")) {
    e.preventDefault();
    const direction = e.key === "ArrowUp" ? -1 : 1;
    handlers.moveCursor?.((currentCursor + 2 + direction) % 2);
    return;
  }

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
  } else if ((step === "mode" || step === "division") && (e.key === "Enter" || e.key === " ")) {
    e.preventDefault();
    root.querySelectorAll<HTMLInputElement>(step === "mode" ? "[data-intro-mode]" : "[data-division]")[currentCursor]?.click();
  } else if (step === "weight" && (e.key === "Enter" || e.key === " ")) {
    e.preventDefault();
    root.querySelector<HTMLButtonElement>("#confirm-weight")?.click();
  } else if (step === "length" && (e.key === "Enter" || e.key === " ")) {
    e.preventDefault();
    if (!state.busy) handlers.start();
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
