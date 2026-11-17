/** Reusable fighter card component used in the live comparison and resolved payoff. */

import { STAT_KEYS, type Judoka, type StatKey } from "../api/types";
import type { MatchResult } from "../game/game";
import { badge, definitionList, valueList } from "./controls";
import { labels, type Helpers } from "./helpers";
import { escapeHtml as esc } from "./utils/escapeHtml";

export type FighterSide = "player" | "opponent";

export interface FighterCardOptions {
  judoka: Judoka;
  side: FighterSide;
  helpers: Helpers;
  result?: MatchResult | null;
  selectedStat?: StatKey | null;
  revealStats?: boolean;
  open?: boolean;
}

/** Build a compact, expandable fighter card with a visible head-to-head result. */
export function fighterCard({
  judoka,
  side,
  helpers,
  result = null,
  selectedStat = null,
  revealStats = false,
  open = false,
}: FighterCardOptions): string {
  const label = side === "player" ? "Your judoka" : "Opponent";
  const rarity = judoka.rarity || "Unclassified";
  const resultStat = result?.stat ?? selectedStat;
  const resultValue = result
    ? side === "player" ? result.playerValue : result.opponentValue
    : resultStat ? judoka.stats[resultStat] : null;
  const resultSummary = resultStat && resultValue !== null
    ? `<p class="fighter-result"><span>${esc(labels[resultStat])}</span><strong>${resultValue}</strong></p>`
    : "";

  const stats = valueList(STAT_KEYS.map((stat) => {
    const hidden = side === "opponent" && !revealStats;
    const selected = stat === resultStat;
    const outcome = selected && result ? ` outcome-${result.outcome}` : "";
    const animate = side === "opponent" && revealStats && !result ? " stat-value-reveal" : "";
    return {
      label: labels[stat],
      value: hidden ? "??" : String(judoka.stats[stat]),
      className: `fighter-stat${selected ? " is-selected" : ""}${outcome}`,
      valueClassName: `fighter-stat-value${hidden ? " is-hidden" : ""}${animate}`,
    };
  }), "fighter-stat-list", `${label} stats`);

  const facts = definitionList([
    { label: "Country", value: judoka.country },
    { label: "Weight", value: `${judoka.weightClass} kg` },
  ], "fighter-facts");

  return `<details class="surface panel fighter-card ${side}" aria-label="${label} details"${open ? " open" : ""}><summary class="fighter-summary"><span class="eyebrow">${label}</span><strong>${esc(helpers.nameOf(judoka))}</strong>${badge(rarity, `rarity rarity-${rarity.toLowerCase()}`)}${resultSummary}</summary><div class="fighter-detail-body">${facts}<h3 class="eyebrow">${label} stats</h3>${stats}</div></details>`;
}

