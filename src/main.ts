import "./style.css";
import { BudokonClient } from "./api/budokon";
import { STAT_KEYS, type Judoka, type StatKey } from "./api/types";
import { MAX_ROUNDS, createMatch, matchSummary, nextMatch, selectStat, strongestStats, type GameMode, type Match, type MatchResult } from "./game/game";
import { parseSavedMatch, stringifySavedMatch } from "./game/session";
import { buttonChoice, disclosure, escapeHtml as esc, primaryButton, quietButton, radioChoice, shortcutHint, surface, toggleControl } from "./ui/controls";

const labels: Record<StatKey, string> = { power: "Power", speed: "Speed", technique: "Technique", kumikata: "Kumi-kata", newaza: "Ne-waza" };
const lengths = [3, 5, 10] as const;
const weights = ["-48", "-52", "-57", "-60", "-63", "-66", "-70", "-73", "-78", "-81", "-90", "-100", "+78", "+100"] as const;
const DRAW_BUFFER_SIZE = 6;
const SAVED_MATCH_KEY = "judokon.activeMatch.v1";
type Division = "absolute" | "weight";
type History = Pick<MatchResult, "outcome" | "stat"> & { roundNumber: number };
const app = document.querySelector<HTMLDivElement>("#app");
if (!app) throw new Error("Application root is missing");
const root = app;
const client = new BudokonClient();
let match: Match | null = null, result: MatchResult | null = null, pendingStat: StatKey | null = null;
let activeSeed = "", activeWeight: string | undefined, drawBuffer: Judoka[] = [];
let target = 3, lengthIndex = 0, busy = false, errorMessage = "", history: History[] = [];
let division: Division = localStorage.getItem("judokon.divisionMode") === "weight" ? "weight" : "absolute";
let mode: GameMode = localStorage.getItem("judokon.gameMode") === "champion" ? "champion" : "classic";
let weight = localStorage.getItem("judokon.weightClass") ?? "random";
let soundEnabled = localStorage.getItem("judokon.soundEnabled") === "true";
let replaySeed = "", seedMessage = "";
let audioContext: AudioContext | null = null;

const nameOf = (j: Judoka) => `${j.firstname} ${j.surname}`;
const detailOf = (j: Judoka) => `${j.country} · ${j.weightClass} kg`;
const divisionLabel = () => division === "absolute" ? "Absolute" : weight === "random" ? "Random weight" : `${weight} kg`;
const modeLabel = () => mode === "champion" ? "Champion" : "Classic Battle";
const eyebrow = (label: string) => `<p class="eyebrow">${esc(label)}</p>`;
function persist(): void { localStorage.setItem("judokon.divisionMode", division); localStorage.setItem("judokon.gameMode", mode); localStorage.setItem("judokon.weightClass", weight); }
function clearSavedMatch(): void { sessionStorage.removeItem(SAVED_MATCH_KEY); }
function saveMatch(): void {
  if (!match || pendingStat) return;
  sessionStorage.setItem(SAVED_MATCH_KEY, stringifySavedMatch({ version: 1, match, result, history, activeSeed, activeWeight, drawBuffer }));
}
function status(): string {
  if (busy) return ">> Drawing judoka…"; if (errorMessage) return `>> ${errorMessage}`; if (!match) return ">> Configure a division and select a match length.";
  if (pendingStat) return ">> Opponent commits…"; if (match.phase === "selecting") return ">> Choose your stat:";
  if (match.phase === "matchOver") return `>> ${match.winner === "draw" ? "Match drawn." : match.winner === "player" ? "You win the match!" : "Opponent wins the match."}`;
  if (!result) return ">> Match resolved."; return `>> ${result.outcome === "draw" ? "No point awarded" : result.outcome === "player" ? "You take the point" : "Opponent takes the point"}: ${labels[result.stat]} ${result.playerValue}–${result.opponentValue}.`;
}
function fighter(j: Judoka, side: "player" | "opponent", comparison = result): string {
  const label = side === "player" ? "Your judoka" : "Opponent", value = comparison ? side === "player" ? comparison.playerValue : comparison.opponentValue : null;
  const chosen = comparison ? `<p class="selected-stat outcome-${comparison.outcome}"><span>${labels[comparison.stat]}</span><strong>${value}</strong></p>` : "";
  const rarity = j.rarity || "Unclassified";
  return surface("section", `fighter-card ${side}`, `${label}: ${nameOf(j)}`, `${eyebrow(label)}<h2>${esc(nameOf(j))}</h2><p>${esc(detailOf(j))}</p>${chosen}<span class="badge rarity rarity-${esc(rarity.toLowerCase())}">${esc(rarity)}</span>`);
}
function advanced(): string {
  const seedControl = `<label class="seed-control" for="replay-seed"><strong>Replay seed</strong><small>Optional. Use the same seed to replay a matchup.</small><input id="replay-seed" value="${esc(replaySeed)}" placeholder="Leave blank for a fresh draw" autocomplete="off" spellcheck="false" /></label>`;
  return disclosure("Advanced options", `${seedControl}${toggleControl("sound-enabled", "Sound", soundEnabled, "Keyboard ticks and outcome beeps")}`);
}
function intro(): string {
  const divisionOptions = radioChoice({ id: "division-absolute", name: "division", label: "Absolute", description: "Open weight", shortcut: "A", checked: division === "absolute", data: { "data-division": "absolute" } })
    + radioChoice({ id: "division-weight", name: "division", label: "Weight class", description: "Comparable division", shortcut: "W", checked: division === "weight", data: { "data-division": "weight" } });
  const modeOptions = radioChoice({ id: "mode-classic", name: "game-mode", label: "Classic Battle", description: "Fresh matchups", shortcut: "C", checked: mode === "classic", data: { "data-intro-mode": "classic" } })
    + radioChoice({ id: "mode-champion", name: "game-mode", label: "Champion", description: "Build a streak", shortcut: "H", checked: mode === "champion", data: { "data-intro-mode": "champion" } });
  const select = lengths.map((n, i) => radioChoice({ id: `length-${n}`, name: "match-length", label: ["Quick", "Medium", "Long"][i]!, description: `First to ${n}`, shortcut: String(i + 1), checked: lengthIndex === i, disabled: busy, data: { "data-length": String(n) } })).join("");
  const options = [`<option value="random" ${weight === "random" ? "selected" : ""}>Random weight class</option>`, ...weights.map((n) => `<option value="${n}" ${weight === n ? "selected" : ""}>${n} kg</option>`)].join("");
  const description = mode === "champion" ? "Your judoka stays in the fight while a new opponent enters each round. Build a continuous win streak." : "Draw a fresh judoka matchup every round and choose the best exchange.";
  return `<section class="intro" aria-labelledby="intro-title"><div class="intro-copy"><p class="eyebrow">Budokon terminal · 2600</p><h1 id="intro-title">Enter the<br/>judoka circuit.</h1><p class="intro-lede">Choose your format, then read the opponent and build a run one point at a time.</p><p class="intro-status" role="status">System ready. Configure your match<span class="block-cursor" aria-hidden="true">█</span></p></div><section class="intro-mode-panel panel" aria-label="Match setup">${eyebrow("Match setup")}<h2>Set the terms</h2><fieldset class="setup-group"><legend>Division</legend><div class="choice-grid">${divisionOptions}</div>${division === "weight" ? `<label class="weight-picker" for="weight-class">Weight class <select id="weight-class">${options}</select></label>` : ""}</fieldset><fieldset class="setup-group"><legend>Game mode</legend><div class="choice-grid">${modeOptions}</div><small>${description}</small></fieldset><fieldset class="setup-group"><legend>Match length</legend><div class="choice-grid length-choices">${select}</div></fieldset><aside class="panel match-rules" aria-label="Match rules"><strong>Match rules</strong><p>Higher stat wins a point; draws score no points. After ${MAX_ROUNDS} rounds, the leading score wins—or the match is drawn.</p></aside>${primaryButton("start", `Start match · First to ${target}`, "Enter", busy)}${advanced()}</section><p class="intro-footnote"><strong>Keys:</strong> <kbd>A</kbd>/<kbd>W</kbd> division · <kbd>C</kbd>/<kbd>H</kbd> mode · <kbd>1–3</kbd> length · <kbd>Enter</kbd> start</p></section>`;
}
function pips(score: number, side: "player" | "opponent"): string { return Array.from({ length: match!.target }, (_, i) => `<span class="score-pip ${side} ${i < score ? "earned" : ""} ${i === score - 1 && result?.outcome === side ? "just-earned" : ""}" aria-hidden="true"></span>`).join(""); }
function scoreboard(m: Match): string { return `<section class="scoreboard" aria-label="Match score: You ${m.scores.player}, opponent ${m.scores.opponent}. First to ${m.target} points."><div class="score-side player"><span>You</span><strong>${m.scores.player}</strong><div class="score-pips">${pips(m.scores.player, "player")}</div></div><p>First to ${m.target}</p><div class="score-side opponent"><span>Opponent</span><strong>${m.scores.opponent}</strong><div class="score-pips">${pips(m.scores.opponent, "opponent")}</div></div></section>`; }
function callout(m: Match, r: MatchResult): string { const move = { power: "a driving throw", speed: "a lightning entry", technique: "clean technique", kumikata: "a dominant grip", newaza: "a tight turnover" }[r.stat]; return r.outcome === "draw" ? `${nameOf(m.player)} and ${nameOf(m.opponent)} are evenly matched in the exchange.` : `${nameOf(r.outcome === "player" ? m.player : m.opponent)} takes the point with ${move}.`; }
function historyStrip(): string { if (!history.length) return ""; return `<section class="match-history" aria-label="Round history">${eyebrow("Round history")}<ol>${history.map((h) => `<li class="${h.outcome}"><span>R${h.roundNumber}</span><strong>${labels[h.stat]}</strong><span>${h.outcome === "player" ? "WIN" : h.outcome === "opponent" ? "LOSS" : "DRAW"}</span></li>`).join("")}</ol></section>`; }
function championProgress(m: Match): string {
  if (m.mode !== "champion") return "";
  const details = matchSummary(m, history), record = details.championRecord!;
  const streak = details.championStreak ?? 0;
  return surface("section", "panel champion-progress", "Champion round progress", `${eyebrow("Champion run")}<dl><div><dt>Round-win streak</dt><dd>${streak} ${streak === 1 ? "round" : "rounds"}</dd></div><div><dt>Round record</dt><dd>${record.wins}–${record.losses}–${record.draws}</dd></div><div><dt>Opponents faced</dt><dd>${m.matchNumber}</dd></div></dl>`);
}
function summary(m: Match): string { if (m.phase !== "matchOver") return ""; const details = matchSummary(m, history); const progress = m.mode === "champion" ? `Run record: ${details.championRecord!.wins}–${details.championRecord!.losses}–${details.championRecord!.draws}` : `Points won: ${details.playerWins}`; const bestChoice = details.bestStat ? `${labels[details.bestStat]} · ${details.bestStatWins}/${details.bestStatSelections} ${details.bestStatWins === 1 ? "win" : "wins"}` : "No winning choice"; return surface("section", "panel match-summary", "Match summary", `${eyebrow("Match summary")}<dl><div><dt>Final score</dt><dd>${details.score}</dd></div><div><dt>Most used stat</dt><dd>${details.decisiveStat ? labels[details.decisiveStat] : "—"}</dd></div><div><dt>Best choice</dt><dd>${bestChoice}</dd></div><div><dt>${m.mode === "champion" ? "Champion progress" : "Match progress"}</dt><dd>${progress}</dd></div></dl>`); }
function resultPanel(m: Match, r: MatchResult): string {
  const title = m.phase === "matchOver" ? r.outcome === "draw" ? "MATCH DRAWN" : r.outcome === "player" ? "MATCH WON" : "MATCH LOST" : r.outcome === "draw" ? "NO POINT AWARDED" : r.outcome === "player" ? "POINT WON" : "POINT LOST";
  return surface("section", `panel result-panel outcome-${r.outcome}`, "Round result", `${eyebrow(title)}<p>You used <strong>${r.playerValue}</strong> in ${labels[r.stat]}. ${esc(nameOf(m.opponent))} had <strong>${r.opponentValue}</strong>.</p><p class="callout">${esc(callout(m, r))}</p>`);
}
function game(m: Match): string {
  const playerStrengths = strongestStats(m.player);
  const stats = STAT_KEYS.map((stat, i) => buttonChoice(labels[stat], String(i + 1), String(m.player.stats[stat]), `data-stat="${stat}"`, m.phase !== "selecting" || busy || Boolean(pendingStat), result?.stat === stat || pendingStat === stat, playerStrengths.includes(stat))).join("");
  const committing = pendingStat ? `<section class="commitment" aria-live="polite"><span class="block-cursor" aria-hidden="true">█</span><div><strong>Opponent commits…</strong><p>Resolving ${labels[pendingStat]}.</p></div></section>` : "";
  const reveal = result ? `${resultPanel(m, result)}${summary(m)}` : "";
  const action = m.phase === "awaitingNext" ? primaryButton("next", "Next round", "Enter") : m.phase === "matchOver" ? `${primaryButton("replay", "Replay match", "Enter")}${quietButton("copy-seed", "Copy replay seed", "Copy")}<p class="replay-seed">Replay seed: <code>${esc(activeSeed)}</code></p>${seedMessage ? `<p class="seed-message" role="status">${esc(seedMessage)}</p>` : ""}` : "";
  const scout = result ? "" : surface("aside", "panel scout-report", "Scout report", `${eyebrow("Scout report")}<p>Opponent's likely strength: <strong>${strongestStats(m.opponent).map((stat) => labels[stat]).join(" / ")}</strong>. Choose your exchange carefully.</p>`);
  const opponent = result ? fighter(m.opponent, "opponent") : surface("section", "fighter-card opponent concealed", "Opponent concealed", `${eyebrow("Opponent")}<h2>Hidden judoka</h2><p>Revealed after your selection.</p>`);
  return `${scoreboard(m)}<section class="battle-layout"><div class="player-column">${fighter(m.player, "player")}${championProgress(m)}${scout}<section aria-label="Stat selection" class="stats">${stats}</section>${committing}${reveal}<div class="actions game-actions">${action}${quietButton("quit", m.phase === "matchOver" ? "Change settings" : "Quit match", "Esc / Q")}</div>${historyStrip()}</div>${opponent}</section>`;
}
function headerContext(): string {
  if (!match) return `${modeLabel()} · ${divisionLabel()} division · First to ${target}`;
  const full = `Round ${match.matchNumber} · ${modeLabel()} · ${divisionLabel()} · First to ${match.target} · You: ${match.scores.player} · Opponent: ${match.scores.opponent}`;
  const compact = `R${match.matchNumber} · ${divisionLabel()} · ${match.scores.player}–${match.scores.opponent} · FT${match.target}`;
  return `<span class="header-context-wide">${full}</span><span class="header-context-compact">${compact}</span>`;
}
function render(): void { const hint = !match ? `${shortcutHint("A / W")} Division ${shortcutHint("1–3")} Length ${shortcutHint("Enter")} Start` : pendingStat ? "Resolving opponent…" : match.phase === "selecting" ? `${shortcutHint("1–5")} Choose a stat ${shortcutHint("Esc / Q")} Quit match` : match.phase === "awaitingNext" ? `${shortcutHint("Enter")} Next round ${shortcutHint("Esc / Q")} Quit match` : `${shortcutHint("Enter")} Play again ${shortcutHint("Esc / Q")} Change settings`; const content = !match ? intro() : `<p id="status" class="active-command" role="status" aria-live="polite">${status()} <span class="block-cursor" aria-hidden="true">█</span></p>${game(match)}`; root.innerHTML = `<header><div>bash - JU-DO-KON</div><p>${headerContext()}</p></header><main id="game" tabindex="-1" class="${!match ? "intro-main" : ""}">${content}</main><footer><span class="footer-hint">${hint}</span></footer>`; }
function start(points = target, seed = replaySeed.trim() || crypto.randomUUID()): void { target = points; lengthIndex = lengths.indexOf(points as typeof lengths[number]); activeSeed = seed; let hash = 0; for (const c of activeSeed) hash = (hash * 31 + c.charCodeAt(0)) >>> 0; activeWeight = division === "weight" ? weight === "random" ? weights[hash % weights.length] : weight : undefined; pendingStat = null; history = []; result = null; drawBuffer = []; seedMessage = ""; clearSavedMatch(); persist(); void draw(); }
function tone(frequency: number, duration: number, volume = 0.025): void {
  if (!soundEnabled) return;
  audioContext ??= new AudioContext();
  if (audioContext.state === "suspended") void audioContext.resume();
  const oscillator = audioContext.createOscillator(), gain = audioContext.createGain();
  oscillator.type = "square"; oscillator.frequency.value = frequency; gain.gain.setValueAtTime(volume, audioContext.currentTime); gain.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + duration);
  oscillator.connect(gain).connect(audioContext.destination); oscillator.start(); oscillator.stop(audioContext.currentTime + duration);
}
function keyboardTick(): void { tone(780, 0.025, 0.014); }
function outcomeBeep(outcome: MatchResult["outcome"]): void { if (outcome === "player") { tone(880, 0.08); window.setTimeout(() => tone(1175, 0.11), 95); } else if (outcome === "opponent") tone(220, 0.16, 0.03); else tone(520, 0.1, 0.018); }
async function drawBatch(seed: string, count: number, minimum: number, exclude?: string[]): Promise<Judoka[]> {
  try { return await client.drawBatch(seed, count, activeWeight, exclude); }
  catch (error) {
    if (count > minimum && error instanceof Error && error.message.startsWith("No compatible")) return client.drawBatch(seed, minimum, activeWeight, exclude);
    throw error;
  }
}
async function draw(): Promise<void> { busy = true; result = null; errorMessage = ""; render(); try { const drawn = await drawBatch(activeSeed, DRAW_BUFFER_SIZE, 2); const [a, b, ...remaining] = drawn; match = createMatch(a!, b!, target, 1, { player: 0, opponent: 0 }, mode); drawBuffer = remaining; saveMatch(); } catch (e) { match = null; drawBuffer = []; errorMessage = e instanceof Error && e.message.startsWith("No compatible") ? `${e.message}. Choose Absolute or another division.` : e instanceof Error ? `${e.message}. Check your connection and try again.` : "Unable to draw judoka. Please try again."; } finally { busy = false; render(); } }
async function next(m: Match): Promise<void> { busy = true; result = null; errorMessage = ""; render(); try { const matchSeed = `${activeSeed}:buffer:${m.matchNumber + 1}`; if (m.mode === "champion") { if (!drawBuffer.length) drawBuffer = await drawBatch(matchSeed, DRAW_BUFFER_SIZE - 1, 1, [m.player.id, m.opponent.id]); match = nextMatch(m, m.player, drawBuffer.shift()!); } else { if (drawBuffer.length < 2) drawBuffer = await drawBatch(matchSeed, DRAW_BUFFER_SIZE, 2); match = nextMatch(m, drawBuffer.shift()!, drawBuffer.shift()!); } saveMatch(); } catch (e) { errorMessage = e instanceof Error ? `${e.message}. Try the next match again.` : "Unable to draw judoka. Please try again."; saveMatch(); } finally { busy = false; render(); } }
function choose(n: number): void { target = n; lengthIndex = lengths.indexOf(n as typeof lengths[number]); render(); root.querySelector<HTMLInputElement>(`[data-length="${n}"]`)?.focus(); }
function resolve(stat: StatKey): void { if (!match || match.phase !== "selecting" || pendingStat) return; pendingStat = stat; render(); window.setTimeout(() => { if (!match || pendingStat !== stat) return; result = selectStat(match, stat); match = result.match; history.push({ outcome: result.outcome, stat, roundNumber: match.matchNumber }); pendingStat = null; outcomeBeep(result.outcome); saveMatch(); render(); root.querySelector<HTMLButtonElement>("#next, #replay")?.focus(); }, 650); }
async function copyReplaySeed(): Promise<void> { try { await navigator.clipboard.writeText(activeSeed); seedMessage = "Replay seed copied."; } catch { seedMessage = "Could not copy the replay seed. Copy the value shown below."; } render(); }
root.addEventListener("click", (e) => { const b = (e.target as Element).closest<HTMLButtonElement>("button"); if (!b || b.disabled) return; if (b.id === "start") start(); else if (b.id === "retry") start(); else if (b.id === "replay") start(target, activeSeed); else if (b.id === "copy-seed") void copyReplaySeed(); else if (b.dataset.stat) resolve(b.dataset.stat as StatKey); else if (b.id === "next" && match) void next(match); else if (b.id === "quit") { match = null; result = null; pendingStat = null; errorMessage = ""; history = []; drawBuffer = []; clearSavedMatch(); render(); } });
root.addEventListener("change", (e) => { const input = e.target as HTMLInputElement; if (input.dataset.division && input.checked) { division = input.dataset.division === "weight" ? "weight" : "absolute"; persist(); render(); root.querySelector<HTMLInputElement>(`[data-division="${division}"]`)?.focus(); return; } if (input.dataset.introMode && input.checked) { mode = input.dataset.introMode === "champion" ? "champion" : "classic"; persist(); render(); root.querySelector<HTMLInputElement>(`[data-intro-mode="${mode}"]`)?.focus(); return; } if (input.dataset.length && input.checked) { choose(Number(input.dataset.length)); return; } if (input.id === "replay-seed") { replaySeed = input.value; return; } if (input.id === "weight-class") weight = input.value; if (input.id === "sound-enabled") { soundEnabled = input.checked; localStorage.setItem("judokon.soundEnabled", String(soundEnabled)); } persist(); render(); });
root.addEventListener("toggle", (e) => { const details = e.target; if (!(details instanceof HTMLDetailsElement) || !details.matches(".advanced")) return; const summary = details.querySelector("summary"), state = details.querySelector(".disclosure-state"); if (summary) summary.setAttribute("aria-label", `${details.open ? "Hide" : "Show"} advanced options`); if (state) state.textContent = details.open ? "Hide" : "Show"; }, true);
document.addEventListener("keydown", (e) => { if ((e.target as HTMLElement).matches("input, select")) return; if (/^[1-5]$/.test(e.key) || ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Enter", " ", "Escape"].includes(e.key) || ["a", "w", "c", "h", "q"].includes(e.key.toLowerCase())) keyboardTick(); if (!match) { if (e.key >= "1" && e.key <= "3") { e.preventDefault(); choose(lengths[Number(e.key) - 1]!); } else if (e.key.toLowerCase() === "a" || e.key.toLowerCase() === "w") { e.preventDefault(); root.querySelector<HTMLInputElement>(`[data-division="${e.key.toLowerCase() === "w" ? "weight" : "absolute"}"]`)?.click(); } else if (e.key.toLowerCase() === "c" || e.key.toLowerCase() === "h") { e.preventDefault(); root.querySelector<HTMLInputElement>(`[data-intro-mode="${e.key.toLowerCase() === "h" ? "champion" : "classic"}"]`)?.click(); } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") { e.preventDefault(); choose(lengths[(lengthIndex + lengths.length - 1) % lengths.length]!); } else if (e.key === "ArrowRight" || e.key === "ArrowDown") { e.preventDefault(); choose(lengths[(lengthIndex + 1) % lengths.length]!); } else if (e.key === "Enter" || e.key === " ") { e.preventDefault(); start(); } return; } if (e.key >= "1" && e.key <= "5" && match.phase === "selecting") resolve(STAT_KEYS[Number(e.key) - 1]!); if ((e.key === "Enter" || e.key === " ") && match.phase === "awaitingNext") { e.preventDefault(); root.querySelector<HTMLButtonElement>("#next")?.click(); } if ((e.key === "Enter" || e.key === " ") && match.phase === "matchOver") { e.preventDefault(); root.querySelector<HTMLButtonElement>("#replay")?.click(); } if (e.key.toLowerCase() === "q" || e.key === "Escape") root.querySelector<HTMLButtonElement>("#quit")?.click(); });
const savedMatch = parseSavedMatch(sessionStorage.getItem(SAVED_MATCH_KEY));
if (savedMatch) {
  match = savedMatch.match; result = savedMatch.result; history = savedMatch.history; activeSeed = savedMatch.activeSeed; activeWeight = savedMatch.activeWeight; drawBuffer = savedMatch.drawBuffer;
}
render();
