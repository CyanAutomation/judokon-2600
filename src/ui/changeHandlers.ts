/**
 * Change Event Handlers
 *
 * Handles input change events (radio buttons, selects, checkboxes).
 * Routes to appropriate handlers based on data attributes and input IDs.
 */

import type { GameState } from "../state";
import { setSoundEnabledPersisted } from "./helpers/soundStorage";

/**
 * Handle division selection (absolute vs weight class)
 */
function handleDivisionChange(
  input: HTMLInputElement,
  state: GameState,
  root: HTMLElement,
  onUpdate: { render: () => void; persistPreferences: () => void }
): void {
  state.division = input.dataset.division === "weight" ? "weight" : "absolute";
  state.setupStep = state.division === "weight" ? "weight" : "length";
  onUpdate.persistPreferences();
  onUpdate.render();
  root.querySelector<HTMLElement>(state.division === "weight" ? "#weight-class" : "#length-3")?.focus();
}

/**
 * Handle intro mode selection (classic vs champion)
 */
function handleModeChange(
  input: HTMLInputElement,
  state: GameState,
  root: HTMLElement,
  onUpdate: { render: () => void; persistPreferences: () => void }
): void {
  state.mode = input.dataset.introMode === "champion" ? "champion" : "classic";
  state.setupStep = "division";
  onUpdate.persistPreferences();
  onUpdate.render();
  root.querySelector<HTMLInputElement>("#division-absolute")?.focus();
}

/**
 * Handle seed input change (replay seed or draft)
 */
function handleSeedChange(input: HTMLInputElement, state: GameState): void {
  if (state.seedModalOpen) state.seedDraft = input.value;
  else state.replaySeed = input.value;
}

/**
 * Handle weight class selection
 */
function handleWeightChange(input: HTMLInputElement, state: GameState): void {
  state.weight = input.value;
}

/**
 * Handle sound toggle
 */
function handleSoundChange(
  input: HTMLInputElement,
  onUpdate: { setSoundEnabled: (enabled: boolean) => void }
): void {
  onUpdate.setSoundEnabled(input.checked);
  setSoundEnabledPersisted(input.checked);
}

export function handleChangeEvent(
  e: Event,
  state: GameState,
  root: HTMLElement,
  onUpdate: { render: () => void; persistPreferences: () => void; setSoundEnabled: (enabled: boolean) => void }
): void {
  const input = e.target as HTMLInputElement;

  // Route to specific handlers based on input attributes
  if (input.dataset.division && input.checked) {
    handleDivisionChange(input, state, root, onUpdate);
    return;
  }

  if (input.dataset.introMode && input.checked) {
    handleModeChange(input, state, root, onUpdate);
    return;
  }

  if (input.dataset.length && input.checked) {
    // Handled by separate choose() function call
    return;
  }

  if (input.id === "replay-seed") {
    handleSeedChange(input, state);
    return;
  }

  if (input.id === "weight-class") {
    handleWeightChange(input, state);
  } else if (input.id === "sound-enabled") {
    handleSoundChange(input, onUpdate);
  } else {
    return;
  }

  onUpdate.persistPreferences();
  onUpdate.render();
}
