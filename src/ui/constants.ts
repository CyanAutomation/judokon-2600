/**
 * UI Constants
 * 
 * Pure data exports: stat labels, weight classes, and match lengths.
 */

import type { StatKey } from "../api/types";

export const labels: Record<StatKey, string> = {
  power: "Power",
  speed: "Speed",
  technique: "Technique",
  kumikata: "Kumi-kata",
  newaza: "Ne-waza"
};

export const pointRule = "The higher number wins the point.";
export const tieRule = "Tied numbers leave the score unchanged.";

export const roundOutcomeCopy = {
  player: "You take the point",
  opponent: "Your opponent takes the point",
  draw: "No point this round"
} as const;

export const matchOutcomeCopy = {
  player: "The match is yours!",
  opponent: "Your opponent takes the match.",
  draw: "It’s a draw!"
} as const;

export const weights = [
  "-48",
  "-52",
  "-57",
  "-60",
  "-63",
  "-66",
  "-70",
  "-73",
  "-78",
  "-81",
  "-90",
  "-100",
  "+78",
  "+100"
] as const;

export const lengths = [3, 5, 10] as const;
