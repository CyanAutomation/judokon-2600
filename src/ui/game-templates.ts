/**
 * Game Screen Templates
 * 
 * HTML generation for the active match interface, including fighter cards, scoreboards, results, and round history.
 */

import { STAT_KEYS, type Judoka, type StatKey } from "../api/types";
import { actionGroup, buttonChoice, type ButtonChoiceConfig, primaryButton, quietButton, surface } from "./controls";
import { type Match, type MatchResult, strongestStats } from "../game/game";
import { type GameState } from "../state";
import { labels, type Helpers } from "./helpers";
import { matchOutcomeCopy, roundOutcomeCopy } from "./constants";
import { escapeHtml as esc } from "./utils/escapeHtml";
import { championProgress, matchBreakdownContent, matchTakeaway } from "./match-templates";

/**
 * Generate fighter card HTML
 */
function fighter(j: Judoka, side: "player" | "opponent", state: GameState, helpers: Helpers): string {
  const label = side === "player" ? "Your judoka" : "Your opponent";
  const value = state.result ? side === "player" ? state.result.playerValue : state.result.opponentValue : null;
  const chosen = state.result ? `<p class="selected-stat outcome-${state.result.outcome}"><span>${labels[state.result.stat]}</span><strong>${value}</strong></p>` : "";
  const rarity = j.rarity || "Unclassified";
  return `<details class="surface panel fighter-card ${side}" aria-label="${label} details"><summary class="fighter-summary"><span class="eyebrow">${label}</span><strong>${esc(helpers.nameOf(j))}</strong><span class="badge rarity rarity-${esc(rarity.toLowerCase())}">${esc(rarity)}</span></summary><div class="fighter-detail-body"><p>${esc(helpers.detailOf(j))}</p>${chosen}</div></details>`;
}

/**
 * Generate score pips
 */
function pips(score: number, side: "player" | "opponent", match: Match, result: MatchResult | null): string {
  return Array.from({ length: match.target }, (_, i) => `<span class="score-pip ${side} ${i < score ? "earned" : ""} ${i === score - 1 && result?.outcome === side ? "just-earned" : ""}" aria-hidden="true"></span>`).join("");
}

/**
 * Generate scoreboard HTML
 */
function scoreboard(m: Match, result: MatchResult | null): string {
  return surface("section", "scoreboard", `Match score: You ${m.scores.player}, opponent ${m.scores.opponent}. First to ${m.target} points.`, `<div class="score-side player"><span>You</span><strong>${m.scores.player}</strong><div class="score-pips">${pips(m.scores.player, "player", m, result)}</div></div><p>First to ${m.target}</p><div class="score-side opponent"><span>Opponent</span><strong>${m.scores.opponent}</strong><div class="score-pips">${pips(m.scores.opponent, "opponent", m, result)}</div></div>`);
}

/**
 * Generate callout text for match result
 */
const resultMoves: Record<StatKey, string> = {
  power: "a driving throw",
  speed: "a lightning entry",
  technique: "clean technique",
  kumikata: "a dominant grip",
  newaza: "a tight turnover"
};

function callout(m: Match, r: MatchResult, helpers: Helpers): string {
  const move = resultMoves[r.stat] ?? "a well-timed move";
  return r.outcome === "draw" ? `${helpers.nameOf(m.player)} and ${helpers.nameOf(m.opponent)} tie this exchange.` : `${helpers.nameOf(r.outcome === "player" ? m.player : m.opponent)} takes the point with ${move}.`;
}

/**
 * Generate match history strip
 */
function historyStrip(state: GameState): string {
  if (!state.history.length) return "";
  const count = state.history.length;
  return `<details class="match-history reference-disclosure" aria-label="Round history"><summary>Round history · ${count} ${count === 1 ? "round" : "rounds"}</summary><ol tabindex="0" aria-label="Round history. Use the left and right arrow keys to view all rounds.">${state.history.map((h) => `<li class="${h.outcome}"><span>R${h.roundNumber}</span><strong>${labels[h.stat]}</strong><span>${h.outcome === "player" ? "WIN" : h.outcome === "opponent" ? "LOSS" : "DRAW"}</span></li>`).join("")}</ol></details>`;
}

/**
 * Generic section panel helper
 */
function sectionPanel(
  section: string,
  label: string,
  content: string
): string {
  return surface("section", section, label, content);
}

/**
 * Generate result panel for round outcome
 */
function resultPanel(m: Match, r: MatchResult, helpers: Helpers): string {
  const title = m.phase === "matchOver" ? matchOutcomeCopy[r.outcome] : roundOutcomeCopy[r.outcome];
  const content = `${helpers.eyebrow(title)}<p>You scored <strong>${r.playerValue}</strong> with ${labels[r.stat]}; ${esc(helpers.nameOf(m.opponent))} scored <strong>${r.opponentValue}</strong>.</p><p class="callout">${esc(callout(m, r, helpers))}</p>`;
  return sectionPanel(`result-panel outcome-${r.outcome}`, "Round result", content);
}

/**
 * Generate game screen HTML
 */
export function game(m: Match, state: GameState, helpers: Helpers): string {
  return `${scoreboard(m, state.result)}<section class="battle-layout" data-phase="${m.phase}">${phaseContent(m, state, helpers)}</section>`;
}

function statChoices(m: Match, state: GameState): string {
  const playerStrengths = strongestStats(m.player);
  const stats = STAT_KEYS.map((stat, i) => {
    const config: ButtonChoiceConfig = {
      label: labels[stat],
      shortcut: String(i + 1),
      value: String(m.player.stats[stat]),
      data: `data-stat="${stat}"`,
      disabled: m.phase !== "selecting" || state.busy || Boolean(state.pendingStat),
      selected: state.result?.stat === stat || state.pendingStat === stat,
      strongest: playerStrengths.includes(stat)
    };
    return buttonChoice(config);
  }).join("");
  return `<section aria-label="Stat selection" class="stats">${stats}</section>`;
}

function commitment(state: GameState): string {
  if (!state.pendingStat) return "";
  return surface("section", "commitment", "Opponent thinking", `<span class="block-cursor" aria-hidden="true">█</span><div><strong>Your opponent is sizing you up…</strong><p>Let’s see how your ${labels[state.pendingStat as StatKey]} stacks up.</p></div>`, { ariaLive: "polite" });
}

function matchActions(m: Match, state: GameState): string {
  const action = m.phase === "awaitingNext"
    ? primaryButton("next", "Next round", "Enter", state.busy)
    : primaryButton("replay", "Replay match", "Enter");
  const quitLabel = m.phase === "matchOver" ? "Change settings" : "Quit match";
  return actionGroup(`${action}${quietButton("quit", quitLabel, "Esc / Q")}`, {
    label: "Match actions",
    className: "game-actions",
  });
}

function replayTools(state: GameState): string {
  return `<details class="replay-details reference-disclosure"><summary>Replay details</summary><div class="replay-tools">${quietButton("copy-seed", "Copy replay seed", "Copy")}<p class="replay-seed">Replay seed: <code>${esc(state.activeSeed)}</code></p>${state.seedMessage ? `<p class="seed-message" role="status">${esc(state.seedMessage)}</p>` : ""}</div></details>`;
}

function decisionArea(m: Match, state: GameState, helpers: Helpers): string {
  const scout = state.result ? "" : `<aside class="scout-report" aria-label="Opponent intel"><p><span class="eyebrow">Opponent top stats</span><strong>${strongestStats(m.opponent).map(stat => labels[stat]).join(" / ")}</strong></p><details class="scout-tip"><summary>Scouting tip</summary><p>Use this as a guide; the opponent’s exact values appear after your pick.</p></details></aside>`;
  return `<section class="round-decision" aria-labelledby="decision-heading"><h2 id="decision-heading" class="decision-heading">Choose a stat</h2><p class="decision-player">Your judoka <strong>${esc(helpers.nameOf(m.player))}</strong></p>${scout}${statChoices(m, state)}</section>`;
}

function selectingContent(m: Match, state: GameState, helpers: Helpers): string {
  const player = fighter(m.player, "player", state, helpers);
  return `${decisionArea(m, state, helpers)}${commitment(state)}${player}${championProgress(m, state, helpers)}${historyStrip(state)}`;
}

function nextRoundContent(m: Match, state: GameState, helpers: Helpers): string {
  const resolved = state.result ? resultPanel(m, state.result, helpers) : "";
  const player = fighter(m.player, "player", state, helpers);
  const opponent = state.result ? fighter(m.opponent, "opponent", state, helpers) : "";
  return `${resolved}${matchActions(m, state)}${player}${opponent}${historyStrip(state)}${championProgress(m, state, helpers)}`;
}

function completedMatchContent(m: Match, state: GameState, helpers: Helpers): string {
  const resolved = state.result ? resultPanel(m, state.result, helpers) : "";
  const postMatch = `<details class="match-breakdown"><summary>Match breakdown</summary><div class="post-match-summary">${matchBreakdownContent(m, state)}</div></details>`;
  const player = fighter(m.player, "player", state, helpers);
  const opponent = state.result ? fighter(m.opponent, "opponent", state, helpers) : "";
  return `${resolved}${matchTakeaway(m, state)}${matchActions(m, state)}${replayTools(state)}${postMatch}${player}${opponent}${historyStrip(state)}${championProgress(m, state, helpers)}`;
}

function phaseContent(m: Match, state: GameState, helpers: Helpers): string {
  switch (m.phase) {
    case "selecting": return selectingContent(m, state, helpers);
    case "awaitingNext": return nextRoundContent(m, state, helpers);
    case "matchOver": return completedMatchContent(m, state, helpers);
  }
}
