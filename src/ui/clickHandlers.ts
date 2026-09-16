/**
 * Click Event Handlers
 * 
 * Handles click events on buttons throughout the application.
 * Routes button clicks to appropriate handlers (start, next, stat selection, etc.).
 */

import type { GameState, SetupStep } from "../state";
import type { Match } from "../game/game";
import type { StatKey } from "../api/types";

export function handleClickEvent(
  e: MouseEvent,
  state: GameState,
  handlers: {
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
  }
): void {
  const b = (e.target as Element).closest<HTMLButtonElement>("button");
  if (!b || b.disabled) return;

  if (b.id === "seed-button") {
    handlers.openSeedModal?.();
  } else if (b.id === "cancel-seed") {
    handlers.closeSeedModal?.();
  } else if (b.id === "save-seed") {
    handlers.saveReplaySeed?.(b.closest<HTMLElement>(".seed-dialog")?.querySelector<HTMLInputElement>("#replay-seed")?.value ?? "");
  } else if (b.id === "sound-enabled") {
    handlers.toggleSound?.();
  } else if (b.dataset.setupStep) {
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
