/**
 * UI Helper Functions and Utilities
 * 
 * Shared formatting functions and context generation used across templates.
 */

import { type Judoka } from "../api/types";
import { escapeHtml as esc } from "./controls";
import { type GameState } from "../state";
import { labels } from "./constants";

// Re-export constants for backward compatibility
export { labels, weights, lengths } from "./constants";

export const createHelpers = (state: GameState) => ({
  nameOf: (j: Judoka) => `${j.firstname} ${j.surname}`,
  detailOf: (j: Judoka) => `${j.country} · ${j.weightClass} kg`,
  divisionLabel: () => state.division === "absolute" ? "Absolute" : state.weight === "random" ? "Random weight" : `${state.weight} kg`,
  modeLabel: () => state.mode === "champion" ? "Champion" : "Classic Battle",
  eyebrow: (label: string) => `<p class="eyebrow">${esc(label)}</p>`
});

type Helpers = ReturnType<typeof createHelpers>;

/**
 * Generate status message based on game state
 */
export function status(state: GameState): string {
  if (state.busy) return ">> Drawing judoka…";
  if (state.errorMessage) return `>> ${state.errorMessage}`;
  if (!state.match) return ">> Configure a division and select a match length.";
  if (state.pendingStat) return ">> Opponent commits…";
  if (state.match.phase === "selecting") return ">> Choose your stat:";
  if (state.match.phase === "matchOver") return `>> ${state.match.winner === "draw" ? "Match drawn." : state.match.winner === "player" ? "You win the match!" : "Opponent wins the match."}`;
  if (!state.result) return ">> Match resolved.";
  return `>> ${state.result.outcome === "draw" ? "No point awarded" : state.result.outcome === "player" ? "You take the point" : "Opponent takes the point"}: ${labels[state.result.stat]} ${state.result.playerValue}–${state.result.opponentValue}.`;
}

/**
 * Generate header context line
 */
export function headerContext(state: GameState, helpers: Helpers): string {
  if (!state.match) return `${helpers.modeLabel()} · ${helpers.divisionLabel()} division · First to ${state.target}`;
  const full = `Round ${state.match.matchNumber} · ${helpers.modeLabel()} · ${helpers.divisionLabel()} · First to ${state.match.target} · You: ${state.match.scores.player} · Opponent: ${state.match.scores.opponent}`;
  const compact = `R${state.match.matchNumber} · ${helpers.divisionLabel()} · ${state.match.scores.player}–${state.match.scores.opponent} · FT${state.match.target}`;
  return `<span class="header-context-wide">${full}</span><span class="header-context-compact">${compact}</span>`;
}

export type { Helpers };

