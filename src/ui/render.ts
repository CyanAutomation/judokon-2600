import { layoutSetupActions } from "./layout";
import type { GameState } from "../state";
import { shortcutHint } from "./controls";
import { footerUtilities, intro, seedDialog } from "./setup-templates";
import { game } from "./game-templates";
import { createHelpers, headerContext, status } from "./helpers";
import { escapeHtml as esc } from "./utils/escapeHtml";

/**
 * Generate keyboard shortcut hint based on current game state
 */
function generateHint(state: GameState): string {
  if (!state.match) {
    // Setup phase hints
    if (state.setupStep === "mode" || !state.setupStep) {
      return `${shortcutHint("C / H")} Choose a game mode`;
    }
    if (state.setupStep === "division") {
      return `${shortcutHint("A / W")} Choose a division`;
    }
    if (state.setupStep === "weight") {
      return `${shortcutHint("Enter")} Continue`;
    }
    return `${shortcutHint("1–3")} Choose a length ${shortcutHint("Enter")} Start`;
  }

  // Match phase hints
  if (state.pendingStat) {
    return "Your opponent is sizing you up…";
  }
  if (state.match.phase === "selecting") {
    return `${shortcutHint("1–5")} Pick a stat ${shortcutHint("Esc / Q")} Quit match`;
  }
  if (state.match.phase === "awaitingNext") {
    return `${shortcutHint("Enter")} Next round ${shortcutHint("Esc / Q")} Quit match`;
  }
  return `${shortcutHint("Enter")} Replay match ${shortcutHint("Esc / Q")} Change settings`;
}

/**
 * Generate optional footer settings panel
 */
function generateSettings(state: GameState): string {
  return !state.match ? footerUtilities(state) : "";
}

export function renderApp(root: HTMLElement, state: GameState): void {
  const settingsOpen = root.querySelector<HTMLDetailsElement>(".footer-settings")?.open;
  const helpers = createHelpers(state);
  const hint = generateHint(state);
  const stickySetupAction = !state.match && (state.setupStep === "weight" || state.setupStep === "length");
  const mainClass = !state.match ? `intro-main${stickySetupAction ? " intro-main--sticky-action" : ""}` : "";
  const quietMatchStatus = Boolean(state.match && !state.busy && !state.errorMessage && (state.match.phase === "selecting" || state.result));
  const content = !state.match
    ? intro(state)
    : `<h1 id="game-title" class="visually-hidden">Round ${state.match.matchNumber} match</h1><p id="status" class="${quietMatchStatus ? "visually-hidden" : "active-command"}" role="status" aria-live="polite">${esc(status(state))} <span class="block-cursor" aria-hidden="true">█</span></p>${game(state.match, state, helpers)}`;

  const settings = generateSettings(state);
  const dialog = !state.match ? seedDialog(state) : "";
  root.innerHTML = `<div class="app-scroll"><header><div class="brand">JU-DO-KON! <span aria-hidden="true">·</span> CIRCUIT 2600</div><p>${headerContext(state, helpers)}</p></header><main id="game" tabindex="-1" class="${mainClass}">${content}</main><footer><div class="footer-toolbar"><span class="footer-hint">${hint}</span>${settings}</div></footer>${dialog}</div>`;
  if (settingsOpen) {
    const settings = root.querySelector<HTMLDetailsElement>(".footer-settings");
    if (settings) settings.open = true;
  }
  layoutSetupActions(root);
}
