/**
 * Game Screen Templates
 * 
 * HTML generation for the active match interface, including fighter cards, scoreboards, results, and round history.
 */

import { STAT_KEYS, type Judoka, type StatKey } from "../api/types";
import { actionGroup, buttonChoice, type ButtonChoiceConfig, definitionList, primaryButton, quietButton, surface } from "./controls";
import { matchSummary, type Match, type MatchResult, strongestStats } from "../game/game";
import { type GameState } from "../state";
import { labels, type Helpers } from "./helpers";
import { matchOutcomeCopy, pointRule, roundOutcomeCopy } from "./constants";
import { escapeHtml as esc } from "./utils/escapeHtml";
import { extractTacticalFeatures } from "../game/tacticalAssessment";

/**
 * Generate fighter card HTML
 */
function fighter(j: Judoka, side: "player" | "opponent", state: GameState, helpers: Helpers): string {
  const label = side === "player" ? "Your judoka" : "Your opponent";
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
  const metrics = definitionList([
    { label: "Round-win streak", value: `${streak} ${streak === 1 ? "round" : "rounds"}` },
    { label: "Round record", value: `${record.wins}–${record.losses}–${record.draws}` },
    { label: "Opponents faced", value: String(m.matchNumber) },
  ], "champion-progress-list");
  const content = `${helpers.eyebrow("Champion run")}${metrics}`;
  return sectionPanel("champion-progress", "Champion round progress", content);
}

/**
 * Generate match summary
 */
function summary(m: Match, state: GameState): string {
  if (m.phase !== "matchOver") return "";
  const details = matchSummary(m, state.history);
  const progress = m.mode === "champion" ? `Run record: ${details.championRecord!.wins}–${details.championRecord!.losses}–${details.championRecord!.draws}` : `Points won: ${details.playerWins}`;
  const bestChoice = details.bestStat
    ? `${labels[details.bestStat]} · ${details.bestStatWins} ${details.bestStatWins === 1 ? "win" : "wins"} from ${details.bestStatSelections} ${details.bestStatSelections === 1 ? "pick" : "picks"}`
    : "No stat won a point";
  const metrics = definitionList([
    { label: "Final score", value: details.score },
    { label: "Most-used stat", value: details.decisiveStat ? labels[details.decisiveStat] : "—" },
    { label: "Best this match", value: bestChoice },
    { label: m.mode === "champion" ? "Champion progress" : "Match progress", value: progress },
  ], "match-summary-list");
  const content = `<p class="eyebrow">Match summary</p>${metrics}`;
  return sectionPanel("match-summary", "Match summary", content);
}

function overRelianceMessage(
  enabled: boolean | undefined,
  decisiveStat: StatKey | null,
  features: ReturnType<typeof extractTacticalFeatures>
): string | null {
  if (!enabled || !decisiveStat || features.repeatedFailedSelections === 0) return null;
  const record = features.selections[decisiveStat];
  if (record.selected < 3 || record.losses <= record.wins) return null;
  return `${labels[decisiveStat]} was your go-to, with ${record.wins} win${record.wins === 1 ? "" : "s"} from ${record.selected} picks.`;
}

function adaptationMessage(
  enabled: boolean | undefined,
  features: ReturnType<typeof extractTacticalFeatures>
): string | null {
  const { decisions, switches } = features.choicesAfterLosses;
  if (!enabled || switches === 0) return null;
  return `After a loss, you switched stats on ${switches} of ${decisions} ${decisions === 1 ? "pick" : "picks"}.`;
}

function missedOpportunityMessage(
  enabled: boolean | undefined,
  features: ReturnType<typeof extractTacticalFeatures>
): string | null {
  const candidate = features.missedOpportunityCandidate;
  if (!enabled || !candidate) return null;
  const favored = features.selections[candidate.favoredStat];
  const alternative = features.selections[candidate.alternativeStat];
  return `${labels[candidate.alternativeStat]} won ${alternative.wins} of ${alternative.selected} picks. Your go-to, ${labels[candidate.favoredStat]}, won ${favored.wins} of ${favored.selected}.`;
}

function momentumResponseMessage(
  enabled: boolean | undefined,
  features: ReturnType<typeof extractTacticalFeatures>
): string | null {
  const decisions = features.choicesAfterWinRuns.decisions + features.choicesAfterLossRuns.decisions;
  const switches = features.choicesAfterWinRuns.switches + features.choicesAfterLossRuns.switches;
  if (!enabled || decisions === 0 || switches === 0) return null;
  return `After a win or loss streak, you switched stats on ${switches} of ${decisions} ${decisions === 1 ? "pick" : "picks"}.`;
}

/** Render code-authored feedback only for high-confidence JEV signals with matching facts. */
function tacticalInsight(m: Match, state: GameState): string {
  const assessment = state.tacticalAssessment;
  if (!assessment) return "";

  const features = extractTacticalFeatures(m.scores, state.history);
  const details = matchSummary(m, state.history);
  const messages = [
    overRelianceMessage(assessment.overReliance, details.decisiveStat, features),
    adaptationMessage(assessment.adaptation, features),
    missedOpportunityMessage(assessment.missedOpportunity, features),
    momentumResponseMessage(assessment.momentumResponse, features)
  ].filter((message): message is string => message !== null);
  if (!messages.length) return "";
  const content = `<p class="eyebrow">Dojo notes</p>${messages.map((message) => `<p>${esc(message)}</p>`).join("")}`;
  return sectionPanel("tactical-insight", "Dojo notes", content);
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
  const statChoices = `<section aria-label="Stat selection" class="stats">${stats}</section>`;
  const committing = state.pendingStat ? surface("section", "commitment", "Opponent thinking", `<span class="block-cursor" aria-hidden="true">█</span><div><strong>Your opponent is sizing you up…</strong><p>Let’s see how your ${labels[state.pendingStat as StatKey]} stacks up.</p></div>`, { ariaLive: "polite" }) : "";
  const resolved = state.result ? resultPanel(m, state.result, helpers) : "";
  const postMatch = m.phase === "matchOver"
    ? `<div class="post-match-summary">${summary(m, state)}${tacticalInsight(m, state)}</div>`
    : "";
  const action = m.phase === "awaitingNext" ? primaryButton("next", "Next round", "Enter", state.busy) : m.phase === "matchOver" ? `${primaryButton("replay", "Replay match", "Enter")}${quietButton("copy-seed", "Copy replay seed", "Copy")}<p class="replay-seed">Replay seed: <code>${esc(state.activeSeed)}</code></p>${state.seedMessage ? `<p class="seed-message" role="status">${esc(state.seedMessage)}</p>` : ""}` : "";
  const scout = state.result ? "" : surface("aside", "scout-report", "Scout report", `${helpers.eyebrow("Scout report")}<p>Your opponent’s top stats: <strong>${strongestStats(m.opponent).map((stat) => labels[stat]).join(" / ")}</strong>. Pick a stat to chase the point.</p>`);
  const decisionGuide = m.phase === "selecting" && !state.pendingStat ? `<p class="decision-guide">Pick one of your judoka’s stats. ${pointRule}</p>` : "";
  const opponent = state.result ? fighter(m.opponent, "opponent", state, helpers) : surface("section", "fighter-card opponent concealed", "Your opponent concealed", `${helpers.eyebrow("Your opponent")}<h2>Hidden judoka</h2><p>Their stats appear after your pick.</p>`);
  const player = fighter(m.player, "player", state, helpers);
  const history = historyStrip(state, helpers);
  const champion = championProgress(m, state, helpers);
  const actions = actionGroup(`${action}${quietButton("quit", m.phase === "matchOver" ? "Change settings" : "Quit match", "Esc / Q")}`, {
    label: "Match actions",
    className: "game-actions",
  });

  const content = m.phase === "selecting"
    ? `${decisionGuide}${statChoices}${committing}${scout}${player}${opponent}${champion}${history}`
    : m.phase === "awaitingNext"
      ? `${resolved}${actions}${player}${opponent}${history}${champion}`
      : `${resolved}${postMatch}${actions}${player}${opponent}${history}${champion}`;

  return `${scoreboard(m, state.result)}<section class="battle-layout" data-phase="${m.phase}">${content}</section>`;
}
