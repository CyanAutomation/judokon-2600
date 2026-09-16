/**
 * Game Screen Templates
 * 
 * HTML generation for the active match interface, including fighter cards, scoreboards, results, and round history.
 */

import { STAT_KEYS, type Judoka, type StatKey } from "../api/types";
import { buttonChoice, primaryButton, quietButton, surface } from "./controls";
import { matchSummary, type Match, type MatchResult, strongestStats } from "../game/game";
import { type GameState } from "../state";
import { labels, type Helpers } from "./helpers";
import { escapeHtml as esc } from "./controls";

/**
 * Generate fighter card HTML
 */
function fighter(j: Judoka, side: "player" | "opponent", state: GameState, helpers: Helpers): string {
  const label = side === "player" ? "Your judoka" : "Opponent";
  const value = state.result ? side === "player" ? state.result.playerValue : state.result.opponentValue : null;
  const chosen = state.result ? `<p class="selected-stat outcome-${state.result.outcome}"><span>${labels[state.result.stat]}</span><strong>${value}</strong></p>` : "";
  const rarity = j.rarity || "Unclassified";
  return surface("section", `fighter-card ${side}`, `${label}: ${helpers.nameOf(j)}`, `${helpers.eyebrow(label)}<h2>${esc(helpers.nameOf(j))}</h2><p>${esc(helpers.detailOf(j))}</p>${chosen}<span class="badge rarity rarity-${esc(rarity.toLowerCase())}">${esc(rarity)}</span>`);
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
  return `<section class="scoreboard" aria-label="Match score: You ${m.scores.player}, opponent ${m.scores.opponent}. First to ${m.target} points."><div class="score-side player"><span>You</span><strong>${m.scores.player}</strong><div class="score-pips">${pips(m.scores.player, "player", m, result)}</div></div><p>First to ${m.target}</p><div class="score-side opponent"><span>Opponent</span><strong>${m.scores.opponent}</strong><div class="score-pips">${pips(m.scores.opponent, "opponent", m, result)}</div></div></section>`;
}

/**
 * Generate callout text for match result
 */
function callout(m: Match, r: MatchResult, helpers: Helpers): string {
  const move = { power: "a driving throw", speed: "a lightning entry", technique: "clean technique", kumikata: "a dominant grip", newaza: "a tight turnover" }[r.stat];
  return r.outcome === "draw" ? `${helpers.nameOf(m.player)} and ${helpers.nameOf(m.opponent)} are evenly matched in the exchange.` : `${helpers.nameOf(r.outcome === "player" ? m.player : m.opponent)} takes the point with ${move}.`;
}

/**
 * Generate match history strip
 */
function historyStrip(state: GameState, helpers: Helpers): string {
  if (!state.history.length) return "";
  return `<section class="match-history" aria-label="Round history">${helpers.eyebrow("Round history")}<ol>${state.history.map((h) => `<li class="${h.outcome}"><span>R${h.roundNumber}</span><strong>${labels[h.stat]}</strong><span>${h.outcome === "player" ? "WIN" : h.outcome === "opponent" ? "LOSS" : "DRAW"}</span></li>`).join("")}</ol></section>`;
}

/**
 * Generate champion progress section
 */
function championProgress(m: Match, state: GameState, helpers: Helpers): string {
  if (m.mode !== "champion") return "";
  const details = matchSummary(m, state.history);
  const record = details.championRecord!;
  const streak = details.championStreak ?? 0;
  return surface("section", "champion-progress", "Champion round progress", `${helpers.eyebrow("Champion run")}<dl><div><dt>Round-win streak</dt><dd>${streak} ${streak === 1 ? "round" : "rounds"}</dd></div><div><dt>Round record</dt><dd>${record.wins}–${record.losses}–${record.draws}</dd></div><div><dt>Opponents faced</dt><dd>${m.matchNumber}</dd></div></dl>`);
}

/**
 * Generate match summary
 */
function summary(m: Match, state: GameState): string {
  if (m.phase !== "matchOver") return "";
  const details = matchSummary(m, state.history);
  const progress = m.mode === "champion" ? `Run record: ${details.championRecord!.wins}–${details.championRecord!.losses}–${details.championRecord!.draws}` : `Points won: ${details.playerWins}`;
  const bestChoice = details.bestStat ? `${labels[details.bestStat]} · ${details.bestStatWins}/${details.bestStatSelections} ${details.bestStatWins === 1 ? "win" : "wins"}` : "No winning choice";
  return surface("section", "match-summary", "Match summary", `<p class="eyebrow">Match summary</p><dl><div><dt>Final score</dt><dd>${details.score}</dd></div><div><dt>Most used stat</dt><dd>${details.decisiveStat ? labels[details.decisiveStat] : "—"}</dd></div><div><dt>Best choice</dt><dd>${bestChoice}</dd></div><div><dt>${m.mode === "champion" ? "Champion progress" : "Match progress"}</dt><dd>${progress}</dd></div></dl>`);
}

/**
 * Generate result panel for round outcome
 */
function resultPanel(m: Match, r: MatchResult, helpers: Helpers): string {
  const title = m.phase === "matchOver" ? r.outcome === "draw" ? "MATCH DRAWN" : r.outcome === "player" ? "MATCH WON" : "MATCH LOST" : r.outcome === "draw" ? "NO POINT AWARDED" : r.outcome === "player" ? "POINT WON" : "POINT LOST";
  return surface("section", `result-panel outcome-${r.outcome}`, "Round result", `${helpers.eyebrow(title)}<p>You used <strong>${r.playerValue}</strong> in ${labels[r.stat]}. ${esc(helpers.nameOf(m.opponent))} had <strong>${r.opponentValue}</strong>.</p><p class="callout">${esc(callout(m, r, helpers))}</p>`);
}

/**
 * Generate game screen HTML
 */
export function game(m: Match, state: GameState, helpers: Helpers): string {
  const playerStrengths = strongestStats(m.player);
  const stats = STAT_KEYS.map((stat, i) => buttonChoice(labels[stat], String(i + 1), String(m.player.stats[stat]), `data-stat="${stat}"`, m.phase !== "selecting" || state.busy || Boolean(state.pendingStat), state.result?.stat === stat || state.pendingStat === stat, playerStrengths.includes(stat))).join("");
  const committing = state.pendingStat ? `<section class="commitment" aria-live="polite"><span class="block-cursor" aria-hidden="true">█</span><div><strong>Opponent commits…</strong><p>Resolving ${labels[state.pendingStat as StatKey]}.</p></div></section>` : "";
  const reveal = state.result ? `${resultPanel(m, state.result, helpers)}${summary(m, state)}` : "";
  const action = m.phase === "awaitingNext" ? primaryButton("next", "Next round", "Enter", state.busy) : m.phase === "matchOver" ? `${primaryButton("replay", "Replay match", "Enter")}${quietButton("copy-seed", "Copy replay seed", "Copy")}<p class="replay-seed">Replay seed: <code>${esc(state.activeSeed)}</code></p>${state.seedMessage ? `<p class="seed-message" role="status">${esc(state.seedMessage)}</p>` : ""}` : "";
  const scout = state.result ? "" : surface("aside", "scout-report", "Scout report", `${helpers.eyebrow("Scout report")}<p>Opponent's likely strength: <strong>${strongestStats(m.opponent).map((stat) => labels[stat]).join(" / ")}</strong>. Choose your exchange carefully.</p>`);
  const decisionGuide = state.result ? "" : `<p class="decision-guide">Choose one of your judoka's stats. The higher value wins the exchange.</p>`;
  const opponent = state.result ? fighter(m.opponent, "opponent", state, helpers) : surface("section", "fighter-card opponent concealed", "Opponent concealed", `${helpers.eyebrow("Opponent")}<h2>Hidden judoka</h2><p>Revealed after your selection.</p>`);
  return `${scoreboard(m, state.result)}<section class="battle-layout"><div class="player-column">${fighter(m.player, "player", state, helpers)}${championProgress(m, state, helpers)}${scout}${decisionGuide}<section aria-label="Stat selection" class="stats">${stats}</section>${committing}${reveal}<div class="actions game-actions">${action}${quietButton("quit", m.phase === "matchOver" ? "Change settings" : "Quit match", "Esc / Q")}</div>${historyStrip(state, helpers)}</div>${opponent}</section>`;
}
