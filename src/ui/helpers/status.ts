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
  if (state.busy) return ">> Putting your matchup together…";
  if (state.errorMessage) return `>> ${state.errorMessage}`;
  if (!state.match) return ">> Choose a game mode to start.";
  if (state.pendingStat) return ">> Your opponent is sizing you up…";
  if (state.match.phase === "selecting") return ">> Pick one of your stats.";
  if (state.match.phase === "matchOver") return `>> ${state.match.winner === "draw" ? "It’s a draw!" : state.match.winner === "player" ? "The match is yours!" : "Your opponent takes the match."}`;
  if (!state.result) return ">> Match resolved.";
  return `>> ${state.result.outcome === "draw" ? "No point this round" : state.result.outcome === "player" ? "You take the point" : "Your opponent takes the point"}: ${labels[state.result.stat]} ${state.result.playerValue}–${state.result.opponentValue}.`;
}
