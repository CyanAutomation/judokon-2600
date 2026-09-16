/**
 * Change Event Handlers
 * 
 * Handles input change events (radio buttons, selects, checkboxes).
 * Routes to appropriate handlers based on data attributes and input IDs.
 */

import type { GameState } from "../state";

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
    if (state.seedModalOpen) state.seedDraft = input.value;
    else state.replaySeed = input.value;
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
