import "./style.css";
import { BudokonClient } from "./api/budokon";
import { STAT_KEYS, type Judoka, type StatKey } from "./api/types";
import { createMatch, selectStat, type Match, type RoundResult } from "./game/game";

const labels: Record<StatKey, string> = { power: "Power", speed: "Speed", technique: "Technique", kumikata: "Kumi-kata", newaza: "Ne-waza" };
const matchLengths = [3, 5, 10] as const;
const app = document.querySelector<HTMLDivElement>("#app");
if (!app) throw new Error("Application root is missing");
const root = app;

const client = new BudokonClient();
let match: Match | null = null;
let result: RoundResult | null = null;
let seed = localStorage.getItem("judokon.seed") ?? "";
let activeSeed = "";
let target = 3;
let matchLengthIndex = 0;
let verbose = localStorage.getItem("judokon.verbose") === "true";
let busy = false;
let errorMessage = "";

function escapeHtml(value: string): string {
  const element = document.createElement("span");
  element.textContent = value;
  return element.innerHTML;
}
function nameOf(judoka: Judoka): string { return `${judoka.firstname} ${judoka.surname}`; }
function detailOf(judoka: Judoka): string { return `${judoka.country} · ${judoka.weightClass} kg`; }
function persist(): void {
  if (seed) localStorage.setItem("judokon.seed", seed);
  else localStorage.removeItem("judokon.seed");
  localStorage.setItem("judokon.verbose", String(verbose));
}
function statusText(): string {
  if (busy) return ">> Drawing judoka…";
  if (errorMessage) return `>> ${errorMessage}`;
  if (!match) return ">> Select a match length to begin.";
  if (match.phase === "selecting") return ">> Choose your stat:";
  if (match.phase === "matchOver") return `>> ${match.winner === "draw" ? "Match drawn." : match.winner === "player" ? "You win the match!" : "Opponent wins the match."}`;
  if (!result) return ">> Round resolved.";
  const noun = result.outcome === "draw" ? "Round drawn" : result.outcome === "player" ? "You win the round" : "Opponent wins the round";
  return `>> ${noun}: ${labels[result.stat]} ${result.playerValue}–${result.opponentValue}.`;
}
function advancedSettings(): string {
  return `<details class="advanced"><summary>Advanced</summary><p>Use a seed only to replay a specific matchup. Leave it blank for a fresh match.</p><label for="seed">Replay seed <input id="seed" aria-label="Replay seed" autocomplete="off" value="${escapeHtml(seed)}" /></label></details>`;
}
function launchScreen(): string {
  const buttons = matchLengths.map((length, index) => `<button data-start="${length}" aria-pressed="${matchLengthIndex === index}" ${busy ? "disabled" : ""}>${["Quick", "Medium", "Long"][index]} (${length})</button>`).join("");
  const retry = errorMessage ? `<button class="retry" data-retry>Retry ${target}-point match</button>` : "";
  return `<section class="launcher" aria-label="Match length"><p class="eyebrow">Classic Battle</p><h2>Select Match Length</h2><p>First to the selected number of points wins.</p><p class="keyboard-hint">Use <kbd>1</kbd>–<kbd>3</kbd>, arrow keys, or choose an option.</p><div class="actions">${buttons}</div>${retry}${advancedSettings()}</section>`;
}
function matchSettings(activeMatch: Match): string {
  return `<details class="settings"><summary>Match settings</summary><p>First to ${activeMatch.target} points. Current match settings cannot change mid-match.</p><label><input id="verbose" type="checkbox" ${verbose ? "checked" : ""}/> Show round log</label><details class="advanced"><summary>Advanced</summary><p>Replay seed: <code>${escapeHtml(activeSeed)}</code></p></details></details>`;
}
function gameScreen(activeMatch: Match): string {
  const stats = STAT_KEYS.map((stat, index) => `<button class="stat" data-stat="${stat}" ${activeMatch.phase !== "selecting" || busy ? "disabled" : ""}><span>[${index + 1}] ${labels[stat]}</span><strong>${activeMatch.player.stats[stat]}</strong></button>`).join("");
  const reveal = result ? `<section class="round-result ${result.outcome}" aria-label="Round result"><strong>${result.outcome === "draw" ? "Draw" : result.outcome === "player" ? "Round won" : "Round lost"}</strong><p>${escapeHtml(nameOf(activeMatch.opponent))} (${escapeHtml(detailOf(activeMatch.opponent))}) had <strong>${result.opponentValue}</strong> in ${labels[result.stat]}.</p></section>` : "";
  const action = activeMatch.phase === "awaitingNext" ? '<button id="next">[Enter] Next round</button>' : activeMatch.phase === "matchOver" ? '<button id="replay">Play again</button>' : "";
  const log = verbose && result ? `<pre aria-label="Round log">round=${activeMatch.round} stat=${result.stat} player=${result.playerValue} opponent=${result.opponentValue} outcome=${result.outcome}</pre>` : "";
  return `<section class="fighter-card"><p class="eyebrow">Your judoka</p><h2>${escapeHtml(nameOf(activeMatch.player))}</h2><p>${escapeHtml(detailOf(activeMatch.player))}</p></section><section aria-label="Stat selection" class="stats">${stats}</section>${reveal}<div class="actions">${action}<button class="quiet" id="quit">[Q] Quit match</button></div>${log}${matchSettings(activeMatch)}`;
}
function render(): void {
  const activeMatch = match;
  root.innerHTML = `<header><div>bash - JU-DO-KON</div><h1>Classic Battle (CLI)</h1><p>Round ${activeMatch?.round ?? 0} · Target: ${activeMatch?.target ?? target} · You: ${activeMatch?.scores.player ?? 0} · Opponent: ${activeMatch?.scores.opponent ?? 0}</p></header><main id="game" tabindex="-1"><p id="status" role="status" aria-live="polite">${statusText()}</p>${activeMatch ? gameScreen(activeMatch) : launchScreen()}</main><footer>Keys: [1–5] Select stat · [Enter] Next · [Q] Quit · [H] Help/settings</footer>`;
}
async function draw(round: number, scores = { player: 0, opponent: 0 }): Promise<void> {
  busy = true; result = null; errorMessage = ""; render();
  try {
    const [player, opponent] = await client.drawPair(`${activeSeed}:${round}`);
    match = createMatch(player, opponent, target, round, scores);
  } catch (error) {
    match = null;
    errorMessage = error instanceof Error ? `${error.message}. Check your connection and try again.` : "Unable to draw judoka. Please try again.";
  } finally {
    busy = false;
    render();
  }
}
function startMatch(points: number): void {
  target = points;
  matchLengthIndex = matchLengths.indexOf(points as typeof matchLengths[number]);
  activeSeed = seed || crypto.randomUUID();
  persist();
  void draw(1);
}
function updateSeed(input: HTMLInputElement): void { seed = input.value.trim(); persist(); }

root.addEventListener("click", (event) => {
  const button = (event.target as Element).closest<HTMLButtonElement>("button");
  if (!button || button.disabled) return;
  if (button.dataset.start) startMatch(Number(button.dataset.start));
  else if (button.dataset.retry) startMatch(target);
  else if (button.dataset.stat && match) { result = selectStat(match, button.dataset.stat as StatKey); match = result.match; render(); }
  else if (button.id === "next" && match) void draw(match.round + 1, match.scores);
  else if (button.id === "replay") startMatch(target);
  else if (button.id === "quit") { match = null; result = null; errorMessage = ""; render(); }
});
root.addEventListener("input", (event) => {
  if ((event.target as HTMLInputElement).id === "seed") updateSeed(event.target as HTMLInputElement);
});
root.addEventListener("change", (event) => {
  if ((event.target as HTMLInputElement).id === "verbose") { verbose = (event.target as HTMLInputElement).checked; persist(); render(); }
});
document.addEventListener("keydown", (event) => {
  if ((event.target as HTMLElement).matches("input, select")) return;
  if (!match) {
    if (event.key >= "1" && event.key <= "3") startMatch(matchLengths[Number(event.key) - 1]);
    if (event.key === "ArrowLeft" || event.key === "ArrowUp") { event.preventDefault(); matchLengthIndex = (matchLengthIndex + matchLengths.length - 1) % matchLengths.length; render(); }
    if (event.key === "ArrowRight" || event.key === "ArrowDown") { event.preventDefault(); matchLengthIndex = (matchLengthIndex + 1) % matchLengths.length; render(); }
    if (event.key === "Enter" || event.key === " ") { event.preventDefault(); startMatch(matchLengths[matchLengthIndex]); }
    return;
  }
  if (event.key >= "1" && event.key <= "5" && match.phase === "selecting") root.querySelector<HTMLButtonElement>(`[data-stat="${STAT_KEYS[Number(event.key) - 1]}"]`)?.click();
  if ((event.key === "Enter" || event.key === " ") && match.phase === "awaitingNext") { event.preventDefault(); root.querySelector<HTMLButtonElement>("#next")?.click(); }
  if (event.key.toLowerCase() === "q") root.querySelector<HTMLButtonElement>("#quit")?.click();
  if (event.key.toLowerCase() === "h") root.querySelector<HTMLDetailsElement>(".settings")?.toggleAttribute("open");
});
render();
