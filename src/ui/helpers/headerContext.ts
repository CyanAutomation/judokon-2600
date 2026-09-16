/**
 * Header Context Generator
 * 
 * Generates responsive header context information about the current
 * match state and configuration.
 */

import { type GameState } from "../../state";
import { type Helpers } from "./createHelpers";

/**
 * Generate header context line with wide and compact versions
 */
export function headerContext(state: GameState, helpers: Helpers): string {
  if (!state.match) return `${helpers.modeLabel()} · ${helpers.divisionLabel()} division · First to ${state.target}`;
  const full = `Round ${state.match.matchNumber} · ${helpers.modeLabel()} · ${helpers.divisionLabel()} · First to ${state.match.target} · You: ${state.match.scores.player} · Opponent: ${state.match.scores.opponent}`;
  const compact = `R${state.match.matchNumber} · ${helpers.divisionLabel()} · ${state.match.scores.player}–${state.match.scores.opponent} · FT${state.match.target}`;
  return `<span class="header-context-wide">${full}</span><span class="header-context-compact">${compact}</span>`;
}
