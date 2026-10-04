/**
 * Game Screen Templates
 * 
 * HTML generation for the active match interface, including fighter cards, scoreboards, results, and round history.
 */

import { STAT_KEYS, type Judoka, type StatKey } from "../api/types";
import { buttonChoice, type ButtonChoiceConfig, primaryButton, quietButton, surface } from "./controls";
import { matchSummary, type Match, type MatchResult, strongestStats } from "../game/game";
import { type GameState } from "../state";
import { labels, type Helpers } from "./helpers";
import { escapeHtml as esc } from "./utils/escapeHtml";
import { extractTacticalFeatures } from "../game/tacticalAssessment";

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
  return `<section class="match-history" aria-label="Round history">${helpers.eyebrow("Round history")}<ol tabindex="0" aria-label="Round history. Use the left and right arrow keys to view all rounds.">${state.history.map((h) => `<li class="${h.outcome}"><span>R${h.roundNumber}</span><strong>${labels[h.stat]}</strong><span>${h.outcome === "player" ? "WIN" : h.outcome === "opponent" ? "LOSS" : "DRAW"}</span></li>`).join("")}</ol></section>`;
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
 * Generate champion progress section
 */
function championProgress(m: Match, state: GameState, helpers: Helpers): string {
  if (m.mode !== "champion") return "";
  const details = matchSummary(m, state.history);
  const record = details.championRecord!;
  const streak = details.championStreak ?? 0;
  const content = `${helpers.eyebrow("Champion run")}<dl><div><dt>Round-win streak</dt><dd>${streak} ${streak === 1 ? "round" : "rounds"}</dd></div><div><dt>Round record</dt><dd>${record.wins}–${record.losses}–${record.draws}</dd></div><div><dt>Opponents faced</dt><dd>${m.matchNumber}</dd></div></dl>`;
  return sectionPanel("champion-progress", "Champion round progress", content);
}

/**
 * Generate match summary
 */
function summary(m: Match, state: GameState): string {
  if (m.phase !== "matchOver") return "";
  const details = matchSummary(m, state.history);
  const progress = m.mode === "champion" ? `Run record: ${details.championRecord!.wins}–${details.championRecord!.losses}–${details.championRecord!.draws}` : `Points won: ${details.playerWins}`;
  const bestChoice = details.bestStat ? `${labels[details.bestStat]} · ${details.bestStatWins}/${details.bestStatSelections} ${details.bestStatWins === 1 ? "win" : "wins"}` : "No winning choice";
  const content = `<p class="eyebrow">Match summary</p><dl><div><dt>Final score</dt><dd>${details.score}</dd></div><div><dt>Most used stat</dt><dd>${details.decisiveStat ? labels[details.decisiveStat] : "—"}</dd></div><div><dt>Best choice</dt><dd>${bestChoice}</dd></div><div><dt>${m.mode === "champion" ? "Champion progress" : "Match progress"}</dt><dd>${progress}</dd></div></dl>`;
  return sectionPanel("match-summary", "Match summary", content);
}

/** Render code-authored feedback only for high-confidence JEV signals with matching facts. */
function tacticalInsight(m: Match, state: GameState): string {
  const assessment = state.tacticalAssessment;
  if (!assessment) return "";

  const features = extractTacticalFeatures(m.scores, state.history);
  const details = matchSummary(m, state.history);
  const messages: string[] = [];

  if (assessment.overReliance && details.decisiveStat && features.repeatedFailedSelections > 0) {
    const record = features.selections[details.decisiveStat];
    if (record.selected >= 3 && record.losses > record.wins) {
      messages.push(`${labels[details.decisiveStat]} was your most-used stat; it lost ${record.losses} of ${record.selected} selections.`);
    }
  }

  if (assessment.adaptation && features.choicesAfterLosses.switches > 0) {
    messages.push(`You changed stats after ${features.choicesAfterLosses.switches} of ${features.choicesAfterLosses.decisions} choices following a loss.`);
  }

  if (assessment.missedOpportunity && features.missedOpportunityCandidate) {
    const candidate = features.missedOpportunityCandidate;
    const favored = features.selections[candidate.favoredStat];
    const alternative = features.selections[candidate.alternativeStat];
    messages.push(`${labels[candidate.alternativeStat]} won ${alternative.wins}/${alternative.selected} selections while ${labels[candidate.favoredStat]}, your most-used stat, won ${favored.wins}/${favored.selected}.`);
  }

  if (assessment.momentumResponse) {
    const decisions = features.choicesAfterWinRuns.decisions + features.choicesAfterLossRuns.decisions;
    const switches = features.choicesAfterWinRuns.switches + features.choicesAfterLossRuns.switches;
    if (decisions > 0 && switches > 0) {
      messages.push(`You switched stats after ${switches} of ${decisions} choices made following runs of wins or losses.`);
    }
  }

  if (!messages.length) return "";
  const content = `<p class="eyebrow">Optional tactical insight</p>${messages.map((message) => `<p>${esc(message)}</p>`).join("")}`;
  return sectionPanel("tactical-insight", "Tactical insight", content);
}

/**
 * Generate result panel for round outcome
 */
function resultPanel(m: Match, r: MatchResult, helpers: Helpers): string {
  const title = m.phase === "matchOver" ? r.outcome === "draw" ? "MATCH DRAWN" : r.outcome === "player" ? "MATCH WON" : "MATCH LOST" : r.outcome === "draw" ? "NO POINT AWARDED" : r.outcome === "player" ? "POINT WON" : "POINT LOST";
  const content = `${helpers.eyebrow(title)}<p>You used <strong>${r.playerValue}</strong> in ${labels[r.stat]}. ${esc(helpers.nameOf(m.opponent))} had <strong>${r.opponentValue}</strong>.</p><p class="callout">${esc(callout(m, r, helpers))}</p>`;
  return sectionPanel(`result-panel outcome-${r.outcome}`, "Round result", content);
}

/**
 * Generate game screen HTML
 */
export function game(m: Match, state: GameState, helpers: Helpers): string {
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
  const committing = state.pendingStat ? `<section class="commitment" aria-live="polite"><span class="block-cursor" aria-hidden="true">█</span><div><strong>Opponent commits…</strong><p>Resolving ${labels[state.pendingStat as StatKey]}.</p></div></section>` : "";
  const resolved = state.result ? resultPanel(m, state.result, helpers) : "";
  const postMatch = state.result ? `${summary(m, state)}${tacticalInsight(m, state)}` : "";
  const action = m.phase === "awaitingNext" ? primaryButton("next", "Next round", "Enter", state.busy) : m.phase === "matchOver" ? `${primaryButton("replay", "Replay match", "Enter")}${quietButton("copy-seed", "Copy replay seed", "Copy")}<p class="replay-seed">Replay seed: <code>${esc(state.activeSeed)}</code></p>${state.seedMessage ? `<p class="seed-message" role="status">${esc(state.seedMessage)}</p>` : ""}` : "";
  const scout = state.result ? "" : surface("aside", "scout-report", "Scout report", `${helpers.eyebrow("Scout report")}<p>Opponent's likely strength: <strong>${strongestStats(m.opponent).map((stat) => labels[stat]).join(" / ")}</strong>. Choose your exchange carefully.</p>`);
  const decisionGuide = state.result ? "" : `<p class="decision-guide">Choose one of your judoka's stats. The higher value wins the exchange.</p>`;
  const opponent = state.result ? fighter(m.opponent, "opponent", state, helpers) : surface("section", "fighter-card opponent concealed", "Opponent concealed", `${helpers.eyebrow("Opponent")}<h2>Hidden judoka</h2><p>Revealed after your selection.</p>`);
  return `${scoreboard(m, state.result)}<section class="battle-layout">${resolved}${fighter(m.player, "player", state, helpers)}${opponent}${historyStrip(state, helpers)}${championProgress(m, state, helpers)}${scout}${decisionGuide}<section aria-label="Stat selection" class="stats">${stats}</section>${committing}${postMatch}<div class="actions game-actions">${action}${quietButton("quit", m.phase === "matchOver" ? "Change settings" : "Quit match", "Esc / Q")}</div></section>`;
}
