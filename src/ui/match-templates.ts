/** Match summary templates kept separate from the active-round composition. */

import { definitionList, surface } from "./controls";
import { matchSummary, type Match } from "../game/game";
import type { GameState } from "../state";
import { labels, type Helpers } from "./helpers";
import { escapeHtml as esc } from "./utils/escapeHtml";
import { tacticalMessages } from "./tacticalMessages";

function sectionPanel(section: string, label: string, content: string): string {
  return surface("section", section, label, content);
}

function bestStatCopy(details: ReturnType<typeof matchSummary>): string {
  return details.bestStat
    ? `${labels[details.bestStat]} · ${details.bestStatWins} ${details.bestStatWins === 1 ? "win" : "wins"} from ${details.bestStatSelections} ${details.bestStatSelections === 1 ? "pick" : "picks"}`
    : "No stat won a point";
}

/** Generate champion progress section. */
export function championProgress(m: Match, state: GameState, helpers: Helpers): string {
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
  return `<details class="champion-progress reference-disclosure" aria-label="Champion round progress"><summary>Champion run · ${streak} ${streak === 1 ? "round" : "rounds"} in a row</summary>${sectionPanel("champion-progress-panel", "Champion round progress", content)}</details>`;
}

function summaryPanel(m: Match, state: GameState): string {
  if (m.phase !== "matchOver") return "";
  const details = matchSummary(m, state.history);
  const items = [
    { label: "Final score", value: details.score },
    { label: "Most-used stat", value: details.decisiveStat ? labels[details.decisiveStat] : "—" },
    { label: "Best this match", value: bestStatCopy(details) },
  ];
  if (m.mode === "classic") items.push({ label: "Match progress", value: `Points won: ${details.playerWins}` });
  if (details.championRecord) {
    const { wins, losses, draws } = details.championRecord;
    items.push({ label: "Champion progress", value: `${wins}–${losses}–${draws}` });
  }
  const metrics = definitionList(items, "match-summary-list");
  const content = `<p class="eyebrow">Match summary</p>${metrics}`;
  return sectionPanel("match-summary", "Match summary", content);
}

export function matchTakeaway(m: Match, state: GameState): string {
  if (m.phase !== "matchOver") return "";
  const details = matchSummary(m, state.history);
  return `<section class="match-takeaway" aria-label="Match takeaway"><span class="eyebrow">Best this match</span><strong>${esc(bestStatCopy(details))}</strong></section>`;
}

function tacticalInsight(m: Match, state: GameState): string {
  const messages = tacticalMessages(m, state);
  if (!messages.length) return "";
  const content = `<h2 id="dojo-notes-title" class="eyebrow" tabindex="-1">Dojo notes</h2>${messages.map(message => `<p>${esc(message)}</p>`).join("")}`;
  return sectionPanel("tactical-insight", "Dojo notes", content);
}

/** Update this region independently when optional insight finishes. */
export function matchBreakdownContent(m: Match, state: GameState): string {
  const issue = state.tacticalIssue ? `<p class="tactical-issue">${esc(state.tacticalIssue)}</p>` : "";
  return `${summaryPanel(m, state)}${tacticalInsight(m, state)}${issue}`;
}
