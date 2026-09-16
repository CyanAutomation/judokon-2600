/**
 * Helper Factory
 * 
 * Factory function that creates formatting and display helper functions
 * based on the current game state.
 */

import { type Judoka } from "../../api/types";
import { escapeHtml as esc } from "../utils/escapeHtml";
import { type GameState } from "../../state";

export const createHelpers = (state: GameState) => ({
  nameOf: (j: Judoka) => `${j.firstname} ${j.surname}`,
  detailOf: (j: Judoka) => `${j.country} · ${j.weightClass} kg`,
  divisionLabel: () => state.division === "absolute" ? "Absolute" : state.weight === "random" ? "Random weight" : `${state.weight} kg`,
  modeLabel: () => state.mode === "champion" ? "Champion" : "Classic Battle",
  eyebrow: (label: string) => `<p class="eyebrow">${esc(label)}</p>`
});

export type Helpers = ReturnType<typeof createHelpers>;
