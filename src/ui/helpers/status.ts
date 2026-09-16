/**
 * Status Message Generator
 * 
 * Generates contextual status messages based on the current game state
 * for display to the player.
 */

import { type GameState } from "../../state";
import { labels } from "../constants";

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
