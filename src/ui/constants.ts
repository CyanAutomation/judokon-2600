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
