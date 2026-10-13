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
  start: (seed?: string) => void;
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
  ["replay", (_, state, h) => h.start(state.activeSeed)],
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

  if (confirmCurrentSetupChoice(target, state, handlers)) return;
  if (startFromLengthChoice(target, e, state, handlers)) return;
  dispatchButtonAction(target, state, handlers);
}

function confirmCurrentSetupChoice(
  target: Element,
  state: GameState,
  handlers: ButtonHandlers
): boolean {
  const setupChoice = findSetupChoice(target);
  if (state.match || state.busy || !setupChoice?.checked) return false;

  const nextStep = confirmedSetupStep(state, setupChoice);
  if (!nextStep) return false;

  handlers.setSetupStep?.(nextStep);
  return true;
}

function findSetupChoice(target: Element): HTMLInputElement | null {
  return target.closest<HTMLInputElement>("input[data-intro-mode], input[data-division]")
    ?? target.closest<HTMLLabelElement>(".choice-card")?.querySelector<HTMLInputElement>("input[data-intro-mode], input[data-division]")
    ?? null;
}

function confirmedSetupStep(state: GameState, setupChoice: HTMLInputElement): SetupStep | null {
  if (state.setupStep === "mode" && setupChoice.dataset.introMode === state.mode) return "division";
  if (state.setupStep === "division" && setupChoice.dataset.division === state.division) {
    return setupChoice.dataset.division === "weight" ? "weight" : "length";
  }
  return null;
}

function startFromLengthChoice(
  target: Element,
  event: MouseEvent,
  state: GameState,
  handlers: ButtonHandlers
): boolean {
  const lengthChoice = target.closest<HTMLInputElement>("input[data-length]")
    ?? target.closest<HTMLElement>(".choice-card")?.querySelector<HTMLInputElement>("input[data-length]");
  if (lengthChoice && !state.match && !state.busy && handlers.startWithLength) {
    const points = Number(lengthChoice.dataset.length);
    if (Number.isInteger(points) && points > 0) {
      event.preventDefault();
      handlers.startWithLength(points);
      return true;
    }
  }
  return false;
}

function dispatchButtonAction(target: Element, state: GameState, handlers: ButtonHandlers): void {
  const button = target.closest<HTMLButtonElement>("button");
  if (!button || button.disabled) return;

  // Check for direct ID match
  const buttonHandler = buttonHandlers.get(button.id);
  if (buttonHandler) {
    buttonHandler(button, state, handlers);
    return;
  }

  // Check for setup step button
  if (button.dataset.setupStep) {
    handlers.setSetupStep?.(button.dataset.setupStep as SetupStep);
    return;
  }

  // Check for stat selection button
  if (button.dataset.stat) {
    handlers.resolve(button.dataset.stat as StatKey);
  }
}
