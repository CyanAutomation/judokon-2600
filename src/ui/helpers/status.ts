/**
 * Status Message Generator
 * 
 * Generates contextual status messages based on the current game state
 * for display to the player.
 */

import { type GameState } from "../../state";
import { labels, matchOutcomeCopy, roundOutcomeCopy } from "../constants";

/**
 * Generate status message based on game state
 */
export function status(state: GameState): string {
  if (state.busy) return ">> Putting your matchup together…";
  if (state.errorMessage) return `>> ${state.errorMessage}`;
  if (!state.match) return ">> Pick a mode to begin.";
  if (state.pendingStat) return ">> Your opponent is sizing you up…";
  if (state.match.phase === "selecting") return ">> Pick one of your stats.";
  if (state.match.phase === "matchOver") return `>> ${matchOutcomeCopy[state.match.winner ?? "draw"]}`;
  if (!state.result) return ">> Match resolved.";
  return `>> ${roundOutcomeCopy[state.result.outcome]}: ${labels[state.result.stat]} ${state.result.playerValue}–${state.result.opponentValue}.`;
}
