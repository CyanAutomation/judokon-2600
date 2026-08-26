import "./style.css";
import { BudokonClient } from "./api/budokon";
import { STAT_KEYS, type Judoka, type StatKey } from "./api/types";
import { createMatch, nextRound, selectStat, type GameMode, type Match, type RoundResult } from "./game/game";

const labels: Record<StatKey, string> = { power: "Power", speed: "Speed", technique: "Technique", kumikata: "Kumi-kata", newaza: "Ne-waza" };
const matchLengths = [3, 5, 10] as const;
const weightClasses = ["-48", "-52", "-57", "-60", "-63", "-66", "-70", "-73", "-78", "-81", "-90", "-100", "+78", "+100"] as const;
type DivisionMode = "absolute" | "weight";
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
let divisionMode: DivisionMode = localStorage.getItem("judokon.divisionMode") === "weight" ? "weight" : "absolute";
let gameMode: GameMode = localStorage.getItem("judokon.gameMode") === "champion" ? "champion" : "classic";
let weightClass = localStorage.getItem("judokon.weightClass") ?? "-81";
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
  localStorage.setItem("judokon.divisionMode", divisionMode);
  localStorage.setItem("judokon.gameMode", gameMode);
  localStorage.setItem("judokon.weightClass", weightClass);
}
function statusText(): string {
  if (busy) return ">> Drawing judoka…";
  if (errorMessage) return `>> ${errorMessage}`;
  if (!match) return ">> Configure a division and select a match length.";
  if (match.phase === "selecting") return ">> Choose your stat:";
  if (match.phase === "matchOver") return `>> ${match.winner === "draw" ? "Match drawn." : match.winner === "player" ? "You win the match!" : "Opponent wins the match."}`;
  if (!result) return ">> Round resolved.";
  const noun = result.outcome === "draw" ? "Round drawn" : result.outcome === "player" ? "You win the round" : "Opponent wins the round";
  return `>> ${noun}: ${labels[result.stat]} ${result.playerValue}–${result.opponentValue}.`;
}
function advancedSettings(): string {
  return `<details class="advanced"><summary>Advanced</summary><p>Use a seed only to replay a specific matchup. Leave it blank for a fresh match.</p><label for="seed">Replay seed <input id="seed" aria-label="Replay seed" autocomplete="off" value="${escapeHtml(seed)}" /></label></details>`;
}
function divisionLabel(): string { return divisionMode === "absolute" ? "Absolute" : `${weightClass} kg`; }
function gameModeLabel(): string { return gameMode === "champion" ? "Champion" : "Top Trumps"; }
function launchScreen(): string {
  const buttons = matchLengths.map((length, index) => `<button data-start="${length}" aria-pressed="${matchLengthIndex === index}" ${busy ? "disabled" : ""}>${["Quick", "Medium", "Long"][index]} (${length})</button>`).join("");
  const retry = errorMessage ? `<button class="retry" data-retry>Retry ${target}-point match</button>` : "";
  const weights = weightClasses.map((value) => `<option value="${value}" ${weightClass === value ? "selected" : ""}>${value} kg</option>`).join("");
  return `<section class="launcher" aria-label="Match setup"><p class="eyebrow">Classic Battle</p><h2>Start a bout</h2><p>Choose a division, a game mode, and a first-to score.</p><fieldset class="mode-picker"><legend>Division</legend><label><input type="radio" name="division-mode" value="absolute" ${divisionMode === "absolute" ? "checked" : ""}/> Absolute <span>Open weight</span></label><label><input type="radio" name="division-mode" value="weight" ${divisionMode === "weight" ? "checked" : ""}/> Weight class <span>Comparable division</span></label></fieldset>${divisionMode === "weight" ? `<label class="weight-picker" for="weight-class">Weight class <select id="weight-class">${weights}</select></label>` : ""}<fieldset class="mode-picker"><legend>Game mode</legend><label><input type="radio" name="game-mode" value="classic" ${gameMode === "classic" ? "checked" : ""}/> Top Trumps <span>Both players draw a new judoka every round.</span></label><label><input type="radio" name="game-mode" value="champion" ${gameMode === "champion" ? "checked" : ""}/> Champion <span>Keep your judoka and face a new opponent each round.</span></label></fieldset><h2 class="match-length-heading">Match length</h2><p>First to the selected number of points wins.</p><p class="keyboard-hint">Use <kbd>1</kbd>–<kbd>3</kbd>, arrow keys, or choose an option.</p><div class="actions">${buttons}</div>${retry}${advancedSettings()}</section>`;
}
function matchSettings(activeMatch: Match): string {
  return `<details class="settings"><summary>Match settings</summary><p>${gameModeLabel()} · ${divisionLabel()} · First to ${activeMatch.target} points. Current match settings cannot change mid-match.</p><label><input id="verbose" type="checkbox" ${verbose ? "checked" : ""}/> Show round log</label><details class="advanced"><summary>Advanced</summary><p>Replay seed: <code>${escapeHtml(activeSeed)}</code></p></details></details>`;
}
function gameScreen(activeMatch: Match): string {
  const stats = STAT_KEYS.map((stat, index) => `<button class="stat" data-stat="${stat}" ${activeMatch.phase !== "selecting" || busy ? "disabled" : ""}><span>[${index + 1}] ${labels[stat]}</span><strong>${activeMatch.player.stats[stat]}</strong></button>`).join("");
  const reveal = result ? `<section class="round-result ${result.outcome}" aria-label="Round result"><strong>${result.outcome === "draw" ? "Draw" : result.outcome === "player" ? "Round won" : "Round lost"}</strong><p>You used <strong>${result.playerValue}</strong> in ${labels[result.stat]}. ${escapeHtml(nameOf(activeMatch.opponent))} had <strong>${result.opponentValue}</strong>.</p></section>` : "";
  const action = activeMatch.phase === "awaitingNext" ? '<button id="next">[Enter] Next round</button>' : activeMatch.phase === "matchOver" ? '<button id="replay">Play again</button>' : "";
  const log = verbose && result ? `<dl class="round-log" aria-label="Round log"><div><dt>Round</dt><dd>${activeMatch.round}</dd></div><div><dt>Stat</dt><dd>${labels[result.stat]}</dd></div><div><dt>Result</dt><dd>${result.outcome}</dd></div></dl>` : "";
  return `<section class="battle-layout"><section class="fighter-card"><p class="eyebrow">Your judoka</p><h2>${escapeHtml(nameOf(activeMatch.player))}</h2><p>${escapeHtml(detailOf(activeMatch.player))}</p></section><section aria-label="Stat selection" class="stats">${stats}</section>${reveal}<div class="actions game-actions">${action}<button class="quiet" id="quit">[Q] Quit match</button></div>${log}</section>${matchSettings(activeMatch)}`;
}
function render(): void {
  const activeMatch = match;
  const keyHint = !activeMatch ? "Keys: [1–3] Match length · [←/→] Choose · [Enter] Start" : activeMatch.phase === "selecting" ? "Keys: [1–5] Select stat · [H] Match settings · [Q] Quit" : "Keys: [Enter] Next round · [H] Match settings · [Q] Quit";
  root.innerHTML = `<header><div>bash - JU-DO-KON</div><h1>Classic Battle (CLI)</h1><p>${activeMatch ? `Round ${activeMatch.round} · ${gameModeLabel()} · ${divisionLabel()} · Target: ${activeMatch.target} · You: ${activeMatch.scores.player} · Opponent: ${activeMatch.scores.opponent}` : `${gameModeLabel()} · ${divisionLabel()} division · Target: ${target}`}</p></header><main id="game" tabindex="-1"><p id="status" role="status" aria-live="polite">${statusText()}</p>${activeMatch ? gameScreen(activeMatch) : launchScreen()}</main><footer>${keyHint}</footer>`;
}
async function draw(): Promise<void> {
  busy = true; result = null; errorMessage = ""; render();
  try {
    const [player, opponent] = await client.drawPair(activeSeed, divisionMode === "weight" ? weightClass : undefined);
    match = createMatch(player, opponent, target, 1, { player: 0, opponent: 0 }, gameMode);
  } catch (error) {
    match = null;
    if (error instanceof Error && error.message.startsWith("No compatible")) errorMessage = `${error.message}. Choose Absolute or another division.`;
    else errorMessage = error instanceof Error ? `${error.message}. Check your connection and try again.` : "Unable to draw judoka. Please try again.";
  } finally {
    busy = false;
    render();
  }
}
async function drawNextRound(activeMatch: Match): Promise<void> {
  busy = true; result = null; errorMessage = ""; render();
  try {
    const roundSeed = `${activeSeed}:${activeMatch.round + 1}`;
    if (activeMatch.mode === "champion") {
      const opponent = await client.drawOpponent(roundSeed, [activeMatch.player.id, activeMatch.opponent.id], divisionMode === "weight" ? weightClass : undefined);
      match = nextRound(activeMatch, activeMatch.player, opponent);
    } else {
      const [player, opponent] = await client.drawPair(roundSeed, divisionMode === "weight" ? weightClass : undefined);
      match = nextRound(activeMatch, player, opponent);
    }
  } catch (error) {
    errorMessage = error instanceof Error ? `${error.message}. Try the next round again.` : "Unable to draw judoka. Please try again.";
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
  void draw();
}
function updateSeed(input: HTMLInputElement): void { seed = input.value.trim(); persist(); }
function focusPrimaryAction(): void { root.querySelector<HTMLButtonElement>("#next, #replay")?.focus(); }

root.addEventListener("click", (event) => {
  const button = (event.target as Element).closest<HTMLButtonElement>("button");
  if (!button || button.disabled) return;
  if (button.dataset.start) startMatch(Number(button.dataset.start));
  else if (button.dataset.retry) startMatch(target);
  else if (button.dataset.stat && match) { result = selectStat(match, button.dataset.stat as StatKey); match = result.match; render(); focusPrimaryAction(); }
  else if (button.id === "next" && match) void drawNextRound(match);
  else if (button.id === "replay") startMatch(target);
  else if (button.id === "quit") { match = null; result = null; errorMessage = ""; render(); }
});
root.addEventListener("input", (event) => {
  if ((event.target as HTMLInputElement).id === "seed") updateSeed(event.target as HTMLInputElement);
});
root.addEventListener("change", (event) => {
  const input = event.target as HTMLInputElement;
  if (input.id === "verbose") { verbose = input.checked; persist(); render(); }
  if (input.name === "division-mode") { divisionMode = input.value === "weight" ? "weight" : "absolute"; persist(); render(); }
  if (input.name === "game-mode") { gameMode = input.value === "champion" ? "champion" : "classic"; persist(); render(); }
  if (input.id === "weight-class") { weightClass = input.value; persist(); render(); }
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
