import "./style.css";
import { BudokonClient } from "./api/budokon";
import { STAT_KEYS, type Judoka, type StatKey } from "./api/types";
import { createMatch, selectStat, type Match, type RoundResult } from "./game/game";

const labels: Record<StatKey, string> = { power: "Power", speed: "Speed", technique: "Technique", kumikata: "Kumi-kata", newaza: "Ne-waza" };
const app = document.querySelector<HTMLDivElement>("#app");
if (!app) throw new Error("Application root is missing");
const root = app;

const client = new BudokonClient();
let match: Match | null = null;
let result: RoundResult | null = null;
let seed = localStorage.getItem("judokon.seed") ?? crypto.randomUUID();
let target = Number(localStorage.getItem("judokon.target") ?? "5");
let verbose = localStorage.getItem("judokon.verbose") === "true";
let busy = false;
let errorMessage = "";

function escapeHtml(value: string): string {
  const element = document.createElement("span");
  element.textContent = value;
  return element.innerHTML;
}
function nameOf(judoka: Judoka): string { return `${judoka.firstname} ${judoka.surname}`; }
function statusText(): string {
  if (busy) return ">> Drawing judoka…";
  if (errorMessage) return `>> ${errorMessage}`;
  if (!match) return ">> Select match length to begin.";
  if (match.phase === "selecting") return ">> Choose your stat:";
  if (match.phase === "matchOver") return `>> ${match.winner === "draw" ? "Match drawn." : match.winner === "player" ? "You win the match!" : "Opponent wins the match."}`;
  if (!result) return ">> Round resolved.";
  const noun = result.outcome === "draw" ? "draw" : result.outcome === "player" ? "You win" : "Opponent wins";
  return `>> ${noun}: ${labels[result.stat]} ${result.playerValue}–${result.opponentValue}.`;
}
function render(): void {
  const activeMatch = match;
  const values = activeMatch ? STAT_KEYS.map((stat, index) => `<button class="stat" data-stat="${stat}" ${activeMatch.phase !== "selecting" || busy ? "disabled" : ""}>[${index + 1}] ${labels[stat]} <strong>${activeMatch.player.stats[stat]}</strong></button>`).join("") : "";
  const reveal = result && activeMatch ? `<p class="reveal">${escapeHtml(nameOf(activeMatch.opponent))} had <strong>${result.opponentValue}</strong> in ${labels[result.stat]}.</p>` : "";
  root.innerHTML = `<header><div>bash - JU-DO-KON</div><h1>Classic Battle (CLI)</h1><p>Round ${activeMatch?.round ?? 0} · Target: ${target} · You: ${activeMatch?.scores.player ?? 0} · Opponent: ${activeMatch?.scores.opponent ?? 0}</p></header>
  <main id="game" tabindex="-1"><p id="status" role="status" aria-live="polite">${statusText()}</p>
  <details open><summary>Match Settings</summary><label>Win target <select id="target" aria-label="Points to win">${[3,5,10].map((value) => `<option value="${value}" ${target === value ? "selected" : ""}>${value}</option>`).join("")}</select></label><label>Seed <input id="seed" aria-label="Deterministic seed" value="${escapeHtml(seed)}" /></label><label><input id="verbose" type="checkbox" ${verbose ? "checked" : ""}/> Verbose log</label></details>
  ${!activeMatch ? `<section aria-label="Match length"><h2>Select Match Length</h2><div class="actions"><button data-start="3">Quick (3)</button><button data-start="5">Medium (5)</button><button data-start="10">Long (10)</button></div></section>` : `<section aria-label="Stat selection" class="stats">${values}</section>${reveal}<div class="actions">${activeMatch.phase === "awaitingNext" ? '<button id="next">[Enter] Next round</button>' : ""}${activeMatch.phase === "matchOver" ? '<button id="replay">Play again</button>' : ""}<button id="quit">[Q] Quit match</button></div>`}
  ${verbose && result && activeMatch ? `<pre aria-label="Verbose log">round=${activeMatch.round} stat=${result.stat} player=${result.playerValue} opponent=${result.opponentValue} outcome=${result.outcome}</pre>` : ""}</main><footer>Keys: [1–5] Select stat · [Enter] Next · [Q] Quit · [H] Toggle settings</footer>`;
  bindEvents();
}
async function draw(round: number, scores = { player: 0, opponent: 0 }): Promise<void> {
  busy = true; result = null; errorMessage = ""; render();
  try { const [player, opponent] = await client.drawPair(`${seed}:${round}`); match = createMatch(player, opponent, target, round, scores); }
  catch (error) { match = null; errorMessage = error instanceof Error ? `${error.message}. Please try again.` : "Unable to draw judoka. Please try again."; }
  finally { busy = false; render(); }
}
function bindEvents(): void {
  document.querySelectorAll<HTMLButtonElement>("[data-start]").forEach((button) => button.addEventListener("click", () => { target = Number(button.dataset.start); persist(); void draw(1); }));
  document.querySelectorAll<HTMLButtonElement>("[data-stat]").forEach((button) => button.addEventListener("click", () => { if (!match) return; result = selectStat(match, button.dataset.stat as StatKey); match = result.match; render(); }));
  document.querySelector<HTMLButtonElement>("#next")?.addEventListener("click", () => { if (match) void draw(match.round + 1, match.scores); });
  document.querySelector<HTMLButtonElement>("#replay")?.addEventListener("click", () => void draw(1));
  document.querySelector<HTMLButtonElement>("#quit")?.addEventListener("click", () => { match = null; result = null; render(); });
  document.querySelector<HTMLSelectElement>("#target")?.addEventListener("change", (event) => { target = Number((event.target as HTMLSelectElement).value); persist(); render(); });
  document.querySelector<HTMLInputElement>("#seed")?.addEventListener("change", (event) => { seed = (event.target as HTMLInputElement).value.trim() || crypto.randomUUID(); persist(); });
  document.querySelector<HTMLInputElement>("#verbose")?.addEventListener("change", (event) => { verbose = (event.target as HTMLInputElement).checked; persist(); render(); });
}
function persist(): void { localStorage.setItem("judokon.seed", seed); localStorage.setItem("judokon.target", String(target)); localStorage.setItem("judokon.verbose", String(verbose)); }
document.addEventListener("keydown", (event) => {
  if ((event.target as HTMLElement).matches("input, select")) return;
  if (event.key >= "1" && event.key <= "5" && match?.phase === "selecting") document.querySelector<HTMLButtonElement>(`[data-stat="${STAT_KEYS[Number(event.key) - 1]}"]`)?.click();
  if ((event.key === "Enter" || event.key === " ") && match?.phase === "awaitingNext") { event.preventDefault(); document.querySelector<HTMLButtonElement>("#next")?.click(); }
  if (event.key.toLowerCase() === "q") document.querySelector<HTMLButtonElement>("#quit")?.click();
  if (event.key.toLowerCase() === "h") { const details = document.querySelector("details"); if (details) details.open = !details.open; }
});
render();
