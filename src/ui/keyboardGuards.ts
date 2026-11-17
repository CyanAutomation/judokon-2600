/**
 * Keyboard event guard functions - testable utilities for determining if keyboard events should be handled
 */

import type { GameState } from "../state";

/** Native controls own their activation keys; game choice inputs keep the documented shortcuts. */
function isNativeInteractiveTarget(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) return false;
  return Boolean(target.closest(
    'a[href], button, input:not(.choice-input), select, textarea, summary, [contenteditable]:not([contenteditable="false"]), [role="button"], [role="menuitem"], [tabindex]:not([tabindex="-1"])'
  ));
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
  return !e.defaultPrevented && !((e.target as Element | null)?.closest?.(".snackbar, .notification-dock")) && !isNativeInteractiveTarget(e.target);
}

/**
 * Check if a key should trigger keyboard tick sound
 */
export function shouldPlayKeyboardTick(key: string): boolean {
  return /^[1-5]$/.test(key) ||
    ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Enter", " ", "Escape"].includes(key) ||
    ["a", "w", "c", "h", "q"].includes(key.toLowerCase());
}
