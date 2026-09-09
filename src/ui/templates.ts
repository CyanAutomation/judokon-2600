/**
 * UI Template Generation Functions
 * 
 * All HTML rendering logic extracted from main.ts for testability and reusability.
 * Functions receive state and dependencies as parameters rather than accessing globals.
 */

import { STAT_KEYS, type Judoka, type StatKey } from "../api/types";
import { buttonChoice, disclosure, escapeHtml as esc, primaryButton, quietButton, radioChoice, surface, toggleControl } from "./controls";
import { matchSummary, type Match, type MatchResult, strongestStats, MAX_ROUNDS } from "../game/game";
import { type GameState } from "../state";

// Helper functions for formatting
export const createHelpers = (state: GameState) => ({
  nameOf: (j: Judoka) => `${j.firstname} ${j.surname}`,
  detailOf: (j: Judoka) => `${j.country} · ${j.weightClass} kg`,
  divisionLabel: () => state.division === "absolute" ? "Absolute" : state.weight === "random" ? "Random weight" : `${state.weight} kg`,
  modeLabel: () => state.mode === "champion" ? "Champion" : "Classic Battle",
  eyebrow: (label: string) => `<p class="eyebrow">${esc(label)}</p>`
});

type Helpers = ReturnType<typeof createHelpers>;

const labels: Record<StatKey, string> = { power: "Power", speed: "Speed", technique: "Technique", kumikata: "Kumi-kata", newaza: "Ne-waza" };
const weights = ["-48", "-52", "-57", "-60", "-63", "-66", "-70", "-73", "-78", "-81", "-90", "-100", "+78", "+100"] as const;
const lengths = [3, 5, 10] as const;

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

/**
 * Generate fighter card HTML
 */
export function fighter(j: Judoka, side: "player" | "opponent", state: GameState, helpers: Helpers): string {
  const label = side === "player" ? "Your judoka" : "Opponent";
  const value = state.result ? side === "player" ? state.result.playerValue : state.result.opponentValue : null;
  const chosen = state.result ? `<p class="selected-stat outcome-${state.result.outcome}"><span>${labels[state.result.stat]}</span><strong>${value}</strong></p>` : "";
  const rarity = j.rarity || "Unclassified";
  return surface("section", `fighter-card ${side}`, `${label}: ${helpers.nameOf(j)}`, `${helpers.eyebrow(label)}<h2>${esc(helpers.nameOf(j))}</h2><p>${esc(helpers.detailOf(j))}</p>${chosen}<span class="badge rarity rarity-${esc(rarity.toLowerCase())}">${esc(rarity)}</span>`);
}

/**
 * Generate advanced options section
 */
export function advanced(state: GameState): string {
  const seedControl = `<label class="seed-control" for="replay-seed"><strong>Replay seed</strong><small>Optional. Use the same seed to replay a matchup.</small><input id="replay-seed" value="${esc(state.replaySeed)}" placeholder="Leave blank for a fresh draw" autocomplete="off" spellcheck="false" /></label>`;
  return disclosure("Advanced options", `${seedControl}${toggleControl("sound-enabled", "Sound", localStorage.getItem("judokon.soundEnabled") === "true", "Keyboard ticks and outcome beeps")}`);
}

/**
 * Generate intro screen HTML
 */
export function intro(state: GameState, helpers: Helpers): string {
  const divisionOptions = radioChoice({ id: "division-absolute", name: "division", label: "Absolute", description: "Open weight", shortcut: "A", checked: state.division === "absolute", data: { "data-division": "absolute" } })
    + radioChoice({ id: "division-weight", name: "division", label: "Weight class", description: "Comparable division", shortcut: "W", checked: state.division === "weight", data: { "data-division": "weight" } });
  const modeOptions = radioChoice({ id: "mode-classic", name: "game-mode", label: "Classic Battle", description: "Fresh matchups", shortcut: "C", checked: state.mode === "classic", data: { "data-intro-mode": "classic" } })
    + radioChoice({ id: "mode-champion", name: "game-mode", label: "Champion", description: "Build a streak", shortcut: "H", checked: state.mode === "champion", data: { "data-intro-mode": "champion" } });
  const select = lengths.map((n, i) => radioChoice({ id: `length-${n}`, name: "match-length", label: ["Quick", "Medium", "Long"][i]!, description: `First to ${n}`, shortcut: String(i + 1), checked: state.lengthIndex === i, disabled: state.busy, data: { "data-length": String(n) } })).join("");
  const options = [`<option value="random" ${state.weight === "random" ? "selected" : ""}>Random weight class</option>`, ...weights.map((n) => `<option value="${n}" ${state.weight === n ? "selected" : ""}>${n} kg</option>`)].join("");
  const description = state.mode === "champion" ? "Your judoka stays in the fight while a new opponent enters each round. Build a continuous win streak." : "Draw a fresh judoka matchup every round and choose the best exchange.";
  const scoringRules = disclosure("How scoring works", `<p>Higher stat wins a point; draws score no points. After ${MAX_ROUNDS} rounds, the leading score wins—or the match is drawn.</p>`);
  return `<section class="intro" aria-labelledby="intro-title"><div class="intro-copy"><p class="eyebrow">Budokon terminal · 2600</p><h1 id="intro-title">Enter the<br/>judoka circuit.</h1><p class="intro-lede">Choose your format, then read the opponent and build a run one point at a time.</p><p class="intro-status" role="status">System ready. Configure your match<span class="block-cursor" aria-hidden="true">█</span></p></div><section class="intro-mode-panel panel" aria-label="Match setup">${helpers.eyebrow("Match setup")}<fieldset class="setup-group"><legend>Division</legend><div class="choice-grid">${divisionOptions}</div>${state.division === "weight" ? `<label class="weight-picker" for="weight-class">Weight class <select id="weight-class">${options}</select></label>` : ""}</fieldset><fieldset class="setup-group"><legend>Game mode</legend><div class="choice-grid">${modeOptions}</div><small>${description}</small></fieldset><fieldset class="setup-group"><legend>Match length</legend><div class="choice-grid length-choices">${select}</div></fieldset>${primaryButton("start", `Start match · First to ${state.target}`, "Enter", state.busy)}${scoringRules}${advanced(state)}</section><p class="intro-footnote"><strong>Keys:</strong> <kbd>A</kbd>/<kbd>W</kbd> division · <kbd>C</kbd>/<kbd>H</kbd> mode · <kbd>1–3</kbd> length · <kbd>Enter</kbd> start</p></section>`;
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
export function scoreboard(m: Match, result: MatchResult | null): string {
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
export function historyStrip(state: GameState, helpers: Helpers): string {
  if (!state.history.length) return "";
  return `<section class="match-history" aria-label="Round history">${helpers.eyebrow("Round history")}<ol>${state.history.map((h) => `<li class="${h.outcome}"><span>R${h.roundNumber}</span><strong>${labels[h.stat]}</strong><span>${h.outcome === "player" ? "WIN" : h.outcome === "opponent" ? "LOSS" : "DRAW"}</span></li>`).join("")}</ol></section>`;
}

/**
 * Generate champion progress section
 */
export function championProgress(m: Match, state: GameState, helpers: Helpers): string {
  if (m.mode !== "champion") return "";
  const details = matchSummary(m, state.history);
  const record = details.championRecord!;
  const streak = details.championStreak ?? 0;
  return surface("section", "panel champion-progress", "Champion round progress", `${helpers.eyebrow("Champion run")}<dl><div><dt>Round-win streak</dt><dd>${streak} ${streak === 1 ? "round" : "rounds"}</dd></div><div><dt>Round record</dt><dd>${record.wins}–${record.losses}–${record.draws}</dd></div><div><dt>Opponents faced</dt><dd>${m.matchNumber}</dd></div></dl>`);
}

/**
 * Generate match summary
 */
export function summary(m: Match, state: GameState): string {
  if (m.phase !== "matchOver") return "";
  const details = matchSummary(m, state.history);
  const progress = m.mode === "champion" ? `Run record: ${details.championRecord!.wins}–${details.championRecord!.losses}–${details.championRecord!.draws}` : `Points won: ${details.playerWins}`;
  const bestChoice = details.bestStat ? `${labels[details.bestStat]} · ${details.bestStatWins}/${details.bestStatSelections} ${details.bestStatWins === 1 ? "win" : "wins"}` : "No winning choice";
  return surface("section", "panel match-summary", "Match summary", `<p class="eyebrow">Match summary</p><dl><div><dt>Final score</dt><dd>${details.score}</dd></div><div><dt>Most used stat</dt><dd>${details.decisiveStat ? labels[details.decisiveStat] : "—"}</dd></div><div><dt>Best choice</dt><dd>${bestChoice}</dd></div><div><dt>${m.mode === "champion" ? "Champion progress" : "Match progress"}</dt><dd>${progress}</dd></div></dl>`);
}

/**
 * Generate result panel for round outcome
 */
export function resultPanel(m: Match, r: MatchResult, helpers: Helpers): string {
  const title = m.phase === "matchOver" ? r.outcome === "draw" ? "MATCH DRAWN" : r.outcome === "player" ? "MATCH WON" : "MATCH LOST" : r.outcome === "draw" ? "NO POINT AWARDED" : r.outcome === "player" ? "POINT WON" : "POINT LOST";
  return surface("section", `panel result-panel outcome-${r.outcome}`, "Round result", `${helpers.eyebrow(title)}<p>You used <strong>${r.playerValue}</strong> in ${labels[r.stat]}. ${esc(helpers.nameOf(m.opponent))} had <strong>${r.opponentValue}</strong>.</p><p class="callout">${esc(callout(m, r, helpers))}</p>`);
}

/**
 * Generate game screen HTML
 */
export function game(m: Match, state: GameState, helpers: Helpers): string {
  const playerStrengths = strongestStats(m.player);
  const stats = STAT_KEYS.map((stat, i) => buttonChoice(labels[stat], String(i + 1), String(m.player.stats[stat]), `data-stat="${stat}"`, m.phase !== "selecting" || state.busy || Boolean(state.pendingStat), state.result?.stat === stat || state.pendingStat === stat, playerStrengths.includes(stat))).join("");
  const committing = state.pendingStat ? `<section class="commitment" aria-live="polite"><span class="block-cursor" aria-hidden="true">█</span><div><strong>Opponent commits…</strong><p>Resolving ${labels[state.pendingStat as StatKey]}.</p></div></section>` : "";
  const reveal = state.result ? `${resultPanel(m, state.result, helpers)}${summary(m, state)}` : "";
  const action = m.phase === "awaitingNext" ? primaryButton("next", "Next round", "Enter") : m.phase === "matchOver" ? `${primaryButton("replay", "Replay match", "Enter")}${quietButton("copy-seed", "Copy replay seed", "Copy")}<p class="replay-seed">Replay seed: <code>${esc(state.activeSeed)}</code></p>${state.seedMessage ? `<p class="seed-message" role="status">${esc(state.seedMessage)}</p>` : ""}` : "";
  const scout = state.result ? "" : surface("aside", "panel scout-report", "Scout report", `${helpers.eyebrow("Scout report")}<p>Opponent's likely strength: <strong>${strongestStats(m.opponent).map((stat) => labels[stat]).join(" / ")}</strong>. Choose your exchange carefully.</p>`);
  const decisionGuide = state.result ? "" : `<p class="decision-guide">Choose one of your judoka’s stats. The higher value wins the exchange.</p>`;
  const opponent = state.result ? fighter(m.opponent, "opponent", state, helpers) : surface("section", "fighter-card opponent concealed", "Opponent concealed", `${helpers.eyebrow("Opponent")}<h2>Hidden judoka</h2><p>Revealed after your selection.</p>`);
  return `${scoreboard(m, state.result)}<section class="battle-layout"><div class="player-column">${fighter(m.player, "player", state, helpers)}${championProgress(m, state, helpers)}${scout}${decisionGuide}<section aria-label="Stat selection" class="stats">${stats}</section>${committing}${reveal}<div class="actions game-actions">${action}${quietButton("quit", m.phase === "matchOver" ? "Change settings" : "Quit match", "Esc / Q")}</div>${historyStrip(state, helpers)}</div>${opponent}</section>`;
}

/**
 * Generate header context line
 */
export function headerContext(state: GameState, helpers: Helpers): string {
  if (!state.match) return `${helpers.modeLabel()} · ${helpers.divisionLabel()} division · First to ${state.target}`;
  const full = `Round ${state.match.matchNumber} · ${helpers.modeLabel()} · ${helpers.divisionLabel()} · First to ${state.match.target} · You: ${state.match.scores.player} · Opponent: ${state.match.scores.opponent}`;
  const compact = `R${state.match.matchNumber} · ${helpers.divisionLabel()} · ${state.match.scores.player}–${state.match.scores.opponent} · FT${state.match.target}`;
  return `<span class="header-context-wide">${full}</span><span class="header-context-compact">${compact}</span>`;
}
