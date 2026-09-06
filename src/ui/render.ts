import type { GameState } from "../state";
import { shortcutHint } from "./controls";
import { createHelpers, game, headerContext, intro, status } from "./templates";

export function renderApp(root: HTMLElement, state: GameState): void {
  const helpers = createHelpers(state);
  const hint = !state.match
    ? `${shortcutHint("A / W")} Division ${shortcutHint("1–3")} Length ${shortcutHint("Enter")} Start`
    : state.pendingStat
      ? "Resolving opponent…"
      : state.match.phase === "selecting"
        ? `${shortcutHint("1–5")} Choose a stat ${shortcutHint("Esc / Q")} Quit match`
        : state.match.phase === "awaitingNext"
          ? `${shortcutHint("Enter")} Next round ${shortcutHint("Esc / Q")} Quit match`
          : `${shortcutHint("Enter")} Play again ${shortcutHint("Esc / Q")} Change settings`;
  const content = !state.match
    ? intro(state, helpers)
    : `<p id="status" class="active-command" role="status" aria-live="polite">${status(state)} <span class="block-cursor" aria-hidden="true">█</span></p>${game(state.match, state, helpers)}`;

  root.innerHTML = `<header><div>bash - JU-DO-KON</div><p>${headerContext(state, helpers)}</p></header><main id="game" tabindex="-1" class="${!state.match ? "intro-main" : ""}">${content}</main><footer><span class="footer-hint">${hint}</span></footer>`;
}
