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
let divisionMode: DivisionMode = localStorage.getItem("judokon.divisionMode") === "weight" ? "weight" : "absolute";
let gameMode: GameMode = localStorage.getItem("judokon.gameMode") === "champion" ? "champion" : "classic";
let weightClass = localStorage.getItem("judokon.weightClass") ?? "random";
let activeWeightClass: string | undefined;
let busy = false;
let errorMessage = "";

function escapeHtml(value: string): string {
  const element = document.createElement("span");
  element.textContent = value;
  return element.innerHTML;
}
function nameOf(judoka: Judoka): string { return `${judoka.firstname} ${judoka.surname}`; }
function detailOf(judoka: Judoka): string { return `${judoka.country} · ${judoka.weightClass} kg`; }
function rarityOf(judoka: Judoka): string { return judoka.rarity || "Unclassified"; }
function fighterCard(judoka: Judoka, side: "player" | "opponent", comparison?: RoundResult | null): string {
  const label = side === "player" ? "Your judoka" : "Opponent";
  const value = comparison ? side === "player" ? comparison.playerValue : comparison.opponentValue : null;
  const selectedStat = comparison ? `<p class="selected-stat outcome-${comparison.outcome}"><span>${labels[comparison.stat]}</span><strong>${value}</strong></p>` : "";
  return `<section class="fighter-card ${side}" aria-label="${label}: ${escapeHtml(nameOf(judoka))}"><p class="eyebrow">${label}</p><h2>${escapeHtml(nameOf(judoka))}</h2><p>${escapeHtml(detailOf(judoka))}</p>${selectedStat}<span class="rarity rarity-${escapeHtml(rarityOf(judoka).toLowerCase())}">${escapeHtml(rarityOf(judoka))}</span></section>`;
}
function concealedOpponentCard(): string {
  return `<section class="fighter-card opponent concealed" aria-label="Opponent concealed"><p class="eyebrow">Opponent</p><h2>Hidden judoka</h2><p>Revealed when the round ends.</p></section>`;
}
function persist(): void {
  if (seed) localStorage.setItem("judokon.seed", seed);
  else localStorage.removeItem("judokon.seed");
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
function divisionLabel(): string { return divisionMode === "absolute" ? "Absolute" : weightClass === "random" ? "Random weight" : `${weightClass} kg`; }
function gameModeLabel(): string { return gameMode === "champion" ? "Champion" : "Top Trumps"; }
function randomWeightClass(seedValue: string): string {
  let hash = 0;
  for (const character of seedValue) hash = (hash * 31 + character.charCodeAt(0)) >>> 0;
  return weightClasses[hash % weightClasses.length]!;
}
function launchScreen(): string {
  const buttons = matchLengths.map((length, index) => `<button data-start="${length}" aria-pressed="${matchLengthIndex === index}" ${busy ? "disabled" : ""}>${["Quick", "Medium", "Long"][index]} (${length})</button>`).join("");
  const retry = errorMessage ? `<button class="retry" data-retry>Retry ${target}-point match</button>` : "";
  const weights = [`<option value="random" ${weightClass === "random" ? "selected" : ""}>Random weight class</option>`, ...weightClasses.map((value) => `<option value="${value}" ${weightClass === value ? "selected" : ""}>${value} kg</option>`)].join("");
  return `<section class="launcher" aria-label="Match setup"><p class="eyebrow">Classic Battle</p><h2>Start a bout</h2><p>Choose a division, a game mode, and a first-to score.</p><fieldset class="mode-picker"><legend>Division</legend><label><input type="radio" name="division-mode" value="absolute" ${divisionMode === "absolute" ? "checked" : ""}/> Absolute <span>Open weight</span></label><label><input type="radio" name="division-mode" value="weight" ${divisionMode === "weight" ? "checked" : ""}/> Weight class <span>Comparable division</span></label></fieldset>${divisionMode === "weight" ? `<label class="weight-picker" for="weight-class">Weight class <select id="weight-class">${weights}</select></label>` : ""}<fieldset class="mode-picker"><legend>Game mode</legend><label><input type="radio" name="game-mode" value="classic" ${gameMode === "classic" ? "checked" : ""}/> Top Trumps <span>Both players draw a new judoka every round.</span></label><label><input type="radio" name="game-mode" value="champion" ${gameMode === "champion" ? "checked" : ""}/> Champion <span>Keep your judoka and face a new opponent each round.</span></label></fieldset><h2 class="match-length-heading">Match length</h2><p>First to the selected number of points wins.</p><p class="keyboard-hint">Use <kbd>1</kbd>–<kbd>3</kbd>, arrow keys, or choose an option.</p><div class="actions">${buttons}</div>${retry}${advancedSettings()}</section>`;
}
function scorePips(score: number, targetScore: number, side: "player" | "opponent"): string {
  return Array.from({ length: targetScore }, (_, index) => `<span class="score-pip ${side} ${index < score ? "earned" : ""}" aria-hidden="true"></span>`).join("");
}
function scoreBoard(activeMatch: Match): string {
  return `<section class="scoreboard" aria-label="Match score: You ${activeMatch.scores.player}, opponent ${activeMatch.scores.opponent}. First to ${activeMatch.target} points."><div class="score-side player"><span>You</span><strong>${activeMatch.scores.player}</strong><div class="score-pips">${scorePips(activeMatch.scores.player, activeMatch.target, "player")}</div></div><p>First to ${activeMatch.target}</p><div class="score-side opponent"><span>Opponent</span><strong>${activeMatch.scores.opponent}</strong><div class="score-pips">${scorePips(activeMatch.scores.opponent, activeMatch.target, "opponent")}</div></div></section>`;
}
function gameScreen(activeMatch: Match): string {
  const stats = STAT_KEYS.map((stat, index) => `<button class="stat ${result?.stat === stat ? `selected-stat outcome-${result.outcome}` : ""}" data-stat="${stat}" ${activeMatch.phase !== "selecting" || busy ? "disabled" : ""}><span>[${index + 1}] ${labels[stat]}</span><strong>${activeMatch.player.stats[stat]}</strong></button>`).join("");
  const reveal = result ? `<section class="round-result ${result.outcome}" aria-label="Round result"><strong>${result.outcome === "draw" ? "Draw" : result.outcome === "player" ? "Round won" : "Round lost"}</strong><p>You used <strong>${result.playerValue}</strong> in ${labels[result.stat]}. ${escapeHtml(nameOf(activeMatch.opponent))} had <strong>${result.opponentValue}</strong>.</p></section>` : "";
  const action = activeMatch.phase === "awaitingNext" ? '<button id="next">[Enter] Next round</button>' : activeMatch.phase === "matchOver" ? '<button id="replay">Play again</button>' : "";
  const log = result ? `<dl class="round-log" aria-label="Round log"><div><dt>Round</dt><dd>${activeMatch.round}</dd></div><div><dt>Stat</dt><dd>${labels[result.stat]}</dd></div><div><dt>Result</dt><dd>${result.outcome}</dd></div></dl>` : "";
  const opponent = result ? fighterCard(activeMatch.opponent, "opponent", result) : concealedOpponentCard();
  return `${scoreBoard(activeMatch)}<section class="battle-layout"><div class="player-column">${fighterCard(activeMatch.player, "player", result)}<section aria-label="Stat selection" class="stats">${stats}</section>${reveal}<div class="actions game-actions">${action}<button class="quiet" id="quit">[Q] Quit match</button></div>${log}</div>${opponent}</section>`;
}
function render(): void {
  const activeMatch = match;
  const keyHint = !activeMatch ? "Keys: [1–3] Match length · [←/→] Choose · [Enter] Start" : activeMatch.phase === "selecting" ? "Keys: [1–5] Select stat · [Q] Quit" : "Keys: [Enter] Next round · [Q] Quit";
  root.innerHTML = `<header><div>bash - JU-DO-KON</div><p>${activeMatch ? `Round ${activeMatch.round} · ${gameModeLabel()} · ${divisionLabel()} · Target: ${activeMatch.target} · You: ${activeMatch.scores.player} · Opponent: ${activeMatch.scores.opponent}` : `${gameModeLabel()} · ${divisionLabel()} division · Target: ${target}`}</p></header><main id="game" tabindex="-1"><p id="status" role="status" aria-live="polite">${statusText()}</p>${activeMatch ? gameScreen(activeMatch) : launchScreen()}</main><footer>${keyHint}</footer>`;
}
async function draw(): Promise<void> {
  busy = true; result = null; errorMessage = ""; render();
  try {
    const [player, opponent] = await client.drawPair(activeSeed, activeWeightClass);
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
      const opponent = await client.drawOpponent(roundSeed, [activeMatch.player.id, activeMatch.opponent.id], activeWeightClass);
      match = nextRound(activeMatch, activeMatch.player, opponent);
    } else {
      const [player, opponent] = await client.drawPair(roundSeed, activeWeightClass);
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
  activeWeightClass = divisionMode === "weight" ? weightClass === "random" ? randomWeightClass(activeSeed) : weightClass : undefined;
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
});
render();
