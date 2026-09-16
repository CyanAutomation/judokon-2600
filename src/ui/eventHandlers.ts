/**
 * Event Handlers Barrel
 * 
 * Re-exports all event handlers (click, change, keyboard) and toggle event handler.
 */

// Re-export all handlers
export { handleClickEvent } from "./clickHandlers";
export { handleChangeEvent } from "./changeHandlers";
export { handleIntroKeyboard, handleMatchKeyboard } from "./keyboardHandlers";

/**
 * Handles toggle events on disclosure/details elements.
 * Updates accessibility labels and visibility state indicators.
 */
export function handleToggleEvent(e: Event): void {
  const details = e.target;
  if (!(details instanceof HTMLDetailsElement) || !details.matches(".advanced")) return;

  const summary = details.querySelector("summary");
  const state = details.querySelector(".disclosure-state");

  if (summary) {
    summary.setAttribute("aria-label", `${details.open ? "Hide" : "Show"} advanced options`);
  }
  if (state) {
    state.textContent = details.open ? "Hide" : "Show";
  }
}
