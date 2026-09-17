import type { GameState } from "../state";
import { shortcutHint } from "./controls";
import { advanced, intro } from "./setup-templates";
import { game } from "./game-templates";
import { createHelpers, headerContext, status } from "./helpers";

/**
 * Generate keyboard shortcut hint based on current game state
 */
function generateHint(state: GameState): string {
  if (!state.match) {
    // Setup phase hints
    if (state.setupStep === "mode" || !state.setupStep) {
      return `${shortcutHint("C / H")} Game mode`;
    }
    if (state.setupStep === "division") {
      return `${shortcutHint("A / W")} Division`;
    }
    if (state.setupStep === "weight") {
      return "Choose a weight class";
    }
    return `${shortcutHint("1–3")} Length ${shortcutHint("Enter")} Start`;
  }

  // Match phase hints
  if (state.pendingStat) {
    return "Resolving opponent…";
  }
  if (state.match.phase === "selecting") {
    return `${shortcutHint("1–5")} Choose a stat ${shortcutHint("Esc / Q")} Quit match`;
  }
  if (state.match.phase === "awaitingNext") {
    return `${shortcutHint("Enter")} Next round ${shortcutHint("Esc / Q")} Quit match`;
  }
  return `${shortcutHint("Enter")} Play again ${shortcutHint("Esc / Q")} Change settings`;
}

/**
 * Generate optional footer settings panel
 */
function generateSettings(state: GameState): string {
  return !state.match ? `<div class="footer-settings">${advanced(state)}</div>` : "";
}

export function renderApp(root: HTMLElement, state: GameState): void {
  const helpers = createHelpers(state);
  const hint = generateHint(state);
  const content = !state.match
    ? intro(state)
    : `<p id="status" class="active-command" role="status" aria-live="polite">${status(state)} <span class="block-cursor" aria-hidden="true">█</span></p>${game(state.match, state, helpers)}`;

  const settings = generateSettings(state);
  root.innerHTML = `<header><div>bash - JU-DO-KON</div><p>${headerContext(state, helpers)}</p></header><main id="game" tabindex="-1" class="${!state.match ? "intro-main" : ""}">${content}</main><footer><span class="footer-hint">${hint}</span>${settings}</footer>`;
}
