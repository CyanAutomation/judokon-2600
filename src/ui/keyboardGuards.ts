/**
 * Keyboard event guard functions - testable utilities for determining if keyboard events should be handled
 */

import type { GameState } from "../state";

/**
 * Check if keyboard event target is an editable input
 */
export function isEditableInput(target: EventTarget | null): boolean {
  return (target as HTMLElement)?.matches("input:not(.choice-input), select") ?? false;
}

/**
 * Check if this keyboard event is an escape in the seed modal
 */
export function isSeedModalEscape(e: KeyboardEvent, state: GameState): boolean {
  return state.seedModalOpen === true && e.key === "Escape";
}

/**
 * Check if keyboard event should be processed by game handlers
 */
export function shouldHandleKeyboardEvent(e: KeyboardEvent): boolean {
  return !isEditableInput(e.target);
}

/**
 * Check if a key should trigger keyboard tick sound
 */
export function shouldPlayKeyboardTick(key: string): boolean {
  return /^[1-5]$/.test(key) ||
    ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Enter", " ", "Escape"].includes(key) ||
    ["a", "w", "c", "h", "q"].includes(key.toLowerCase());
}
