/**
 * Click Event Handlers
 * 
 * Handles click events on buttons throughout the application.
 * Routes button clicks to appropriate handlers (start, next, stat selection, etc.).
 */

import type { GameState, SetupStep } from "../state";
import type { Match } from "../game/game";
import type { StatKey } from "../api/types";

type ButtonHandler = (button: HTMLButtonElement, state: GameState, handlers: ButtonHandlers) => void;

interface ButtonHandlers {
  start: () => void;
  copyReplaySeed: () => Promise<void>;
  next: (m: Match) => Promise<void>;
  resolve: (s: StatKey) => void;
  clearAndExit: () => void;
  setSetupStep?: (step: SetupStep) => void;
  openSeedModal?: () => void;
  closeSeedModal?: () => void;
  saveReplaySeed?: (seed: string) => void;
  toggleSound?: () => void;
  startWithLength?: (points: number) => void;
}

/**
 * Map-based button handler dispatch
 */
const buttonHandlers = new Map<string, ButtonHandler>([
  ["seed-button", (_, __, h) => h.openSeedModal?.()],
  ["cancel-seed", (_, __, h) => h.closeSeedModal?.()],
  ["save-seed", (b, _, h) => h.saveReplaySeed?.(b.closest<HTMLElement>(".seed-dialog")?.querySelector<HTMLInputElement>("#replay-seed")?.value ?? "")],
  ["sound-enabled", (_, __, h) => h.toggleSound?.()],
  ["confirm-weight", (_, __, h) => h.setSetupStep?.("length")],
  ["start", (_, __, h) => h.start()],
  ["retry", (_, __, h) => h.start()],
  ["replay", (_, __, h) => h.start()],
  ["copy-seed", (_, __, h) => void h.copyReplaySeed()],
  ["next", (_, s, h) => s.match && void h.next(s.match)],
  ["quit", (_, __, h) => h.clearAndExit()]
]);

export function handleClickEvent(
  e: MouseEvent,
  state: GameState,
  handlers: ButtonHandlers
): void {
  const target = e.target as Element;
  const lengthChoice = target.closest<HTMLInputElement>("input[data-length]")
    ?? target.closest<HTMLElement>(".choice-card")?.querySelector<HTMLInputElement>("input[data-length]");
  if (lengthChoice && !state.match && !state.busy && handlers.startWithLength) {
    const points = Number(lengthChoice.dataset.length);
    if (Number.isInteger(points) && points > 0) {
      e.preventDefault();
      handlers.startWithLength(points);
      return;
    }
  }

  const b = target.closest<HTMLButtonElement>("button");
  if (!b || b.disabled) return;

  // Check for direct ID match
  const buttonHandler = buttonHandlers.get(b.id);
  if (buttonHandler) {
    buttonHandler(b, state, handlers);
    return;
  }

  // Check for setup step button
  if (b.dataset.setupStep) {
    handlers.setSetupStep?.(b.dataset.setupStep as SetupStep);
    return;
  }

  // Check for stat selection button
  if (b.dataset.stat) {
    handlers.resolve(b.dataset.stat as StatKey);
  }
}
