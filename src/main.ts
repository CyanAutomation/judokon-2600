import "./style.css";
import { BudokonClient } from "./api/budokon";
import { STAT_KEYS, type Judoka, type StatKey } from "./api/types";
import { MAX_ROUNDS, createMatch, matchSummary, nextMatch, selectStat, strongestStats, type Match, type MatchResult } from "./game/game";
import { buttonChoice, disclosure, escapeHtml as esc, primaryButton, quietButton, radioChoice, shortcutHint, surface, toggleControl } from "./ui/controls";
import { handleClickEvent, handleChangeEvent, handleToggleEvent, handleIntroKeyboard, handleMatchKeyboard } from "./ui/eventHandlers";
import { initAudio, keyboardTick, outcomeBeep, setSoundEnabled } from "./audio";
import { clearSavedMatch, createGameState, loadSavedGameState, persistPreferences, saveGameState, type GameState } from "./state";

const labels: Record<StatKey, string> = { power: "Power", speed: "Speed", technique: "Technique", kumikata: "Kumi-kata", newaza: "Ne-waza" };
const lengths = [3, 5, 10] as const;
const weights = ["-48", "-52", "-57", "-60", "-63", "-66", "-70", "-73", "-78", "-81", "-90", "-100", "+78", "+100"] as const;
const DRAW_BUFFER_SIZE = 6;
const app = document.querySelector<HTMLDivElement>("#app");
if (!app) throw new Error("Application root is missing");
const root = app;
const client = new BudokonClient();

// Initialize game state from localStorage and sessionStorage
const state: GameState = createGameState();
const savedMatch = loadSavedGameState();
if (savedMatch) {
  state.match = savedMatch.match ?? null;
  state.result = savedMatch.result ?? null;
  state.history = savedMatch.history ?? [];
  state.activeSeed = savedMatch.activeSeed ?? "";
  state.activeWeight = savedMatch.activeWeight;
  state.drawBuffer = savedMatch.drawBuffer ?? [];
}

// Initialize audio system
initAudio(localStorage.getItem("judokon.soundEnabled") === "true");

const nameOf = (j: Judoka) => `${j.firstname} ${j.surname}`;
const detailOf = (j: Judoka) => `${j.country} · ${j.weightClass} kg`;
const divisionLabel = () => state.division === "absolute" ? "Absolute" : state.weight === "random" ? "Random weight" : `${state.weight} kg`;
const modeLabel = () => state.mode === "champion" ? "Champion" : "Classic Battle";
const eyebrow = (label: string) => `<p class="eyebrow">${esc(label)}</p>`;
function status(): string {
  if (state.busy) return ">> Drawing judoka…"; 
  if (state.errorMessage) return `>> ${state.errorMessage}`; 
  if (!state.match) return ">> Configure a division and select a match length.";
  if (state.pendingStat) return ">> Opponent commits…"; 
  if (state.match.phase === "selecting") return ">> Choose your stat:";
  if (state.match.phase === "matchOver") return `>> ${state.match.winner === "draw" ? "Match drawn." : state.match.winner === "player" ? "You win the match!" : "Opponent wins the match."}`;
  if (!state.result) return ">> Match resolved."; 
  return `>> ${state.result.outcome === "draw" ? "No point awarded" : state.result.outcome === "player" ? "You take the point" : "Opponent takes the point"}: ${labels[state.result.stat]} ${state.result.playerValue}–${state.result.opponentValue}.`;
}
function fighter(j: Judoka, side: "player" | "opponent", comparison = state.result): string {
  const label = side === "player" ? "Your judoka" : "Opponent", value = comparison ? side === "player" ? comparison.playerValue : comparison.opponentValue : null;
  const chosen = comparison ? `<p class="selected-stat outcome-${comparison.outcome}"><span>${labels[comparison.stat]}</span><strong>${value}</strong></p>` : "";
  const rarity = j.rarity || "Unclassified";
  return surface("section", `fighter-card ${side}`, `${label}: ${nameOf(j)}`, `${eyebrow(label)}<h2>${esc(nameOf(j))}</h2><p>${esc(detailOf(j))}</p>${chosen}<span class="badge rarity rarity-${esc(rarity.toLowerCase())}">${esc(rarity)}</span>`);
}
function advanced(): string {
  const seedControl = `<label class="seed-control" for="replay-seed"><strong>Replay seed</strong><small>Optional. Use the same seed to replay a matchup.</small><input id="replay-seed" value="${esc(state.replaySeed)}" placeholder="Leave blank for a fresh draw" autocomplete="off" spellcheck="false" /></label>`;
  return disclosure("Advanced options", `${seedControl}${toggleControl("sound-enabled", "Sound", localStorage.getItem("judokon.soundEnabled") === "true", "Keyboard ticks and outcome beeps")}`);
}
function intro(): string {
  const divisionOptions = radioChoice({ id: "division-absolute", name: "division", label: "Absolute", description: "Open weight", shortcut: "A", checked: state.division === "absolute", data: { "data-division": "absolute" } })
    + radioChoice({ id: "division-weight", name: "division", label: "Weight class", description: "Comparable division", shortcut: "W", checked: state.division === "weight", data: { "data-division": "weight" } });
  const modeOptions = radioChoice({ id: "mode-classic", name: "game-mode", label: "Classic Battle", description: "Fresh matchups", shortcut: "C", checked: state.mode === "classic", data: { "data-intro-mode": "classic" } })
    + radioChoice({ id: "mode-champion", name: "game-mode", label: "Champion", description: "Build a streak", shortcut: "H", checked: state.mode === "champion", data: { "data-intro-mode": "champion" } });
  const select = lengths.map((n, i) => radioChoice({ id: `length-${n}`, name: "match-length", label: ["Quick", "Medium", "Long"][i]!, description: `First to ${n}`, shortcut: String(i + 1), checked: state.lengthIndex === i, disabled: state.busy, data: { "data-length": String(n) } })).join("");
  const options = [`<option value="random" ${state.weight === "random" ? "selected" : ""}>Random weight class</option>`, ...weights.map((n) => `<option value="${n}" ${state.weight === n ? "selected" : ""}>${n} kg</option>`)].join("");
  const description = state.mode === "champion" ? "Your judoka stays in the fight while a new opponent enters each round. Build a continuous win streak." : "Draw a fresh judoka matchup every round and choose the best exchange.";
  return `<section class="intro" aria-labelledby="intro-title"><div class="intro-copy"><p class="eyebrow">Budokon terminal · 2600</p><h1 id="intro-title">Enter the<br/>judoka circuit.</h1><p class="intro-lede">Choose your format, then read the opponent and build a run one point at a time.</p><p class="intro-status" role="status">System ready. Configure your match<span class="block-cursor" aria-hidden="true">█</span></p></div><section class="intro-mode-panel panel" aria-label="Match setup">${eyebrow("Match setup")}<h2>Set the terms</h2><fieldset class="setup-group"><legend>Division</legend><div class="choice-grid">${divisionOptions}</div>${state.division === "weight" ? `<label class="weight-picker" for="weight-class">Weight class <select id="weight-class">${options}</select></label>` : ""}</fieldset><fieldset class="setup-group"><legend>Game mode</legend><div class="choice-grid">${modeOptions}</div><small>${description}</small></fieldset><fieldset class="setup-group"><legend>Match length</legend><div class="choice-grid length-choices">${select}</div></fieldset><aside class="panel match-rules" aria-label="Match rules"><strong>Match rules</strong><p>Higher stat wins a point; draws score no points. After ${MAX_ROUNDS} rounds, the leading score wins—or the match is drawn.</p></aside>${primaryButton("start", `Start match · First to ${state.target}`, "Enter", state.busy)}${advanced()}</section><p class="intro-footnote"><strong>Keys:</strong> <kbd>A</kbd>/<kbd>W</kbd> division · <kbd>C</kbd>/<kbd>H</kbd> mode · <kbd>1–3</kbd> length · <kbd>Enter</kbd> start</p></section>`;
}
function pips(score: number, side: "player" | "opponent"): string { return Array.from({ length: state.match!.target }, (_, i) => `<span class="score-pip ${side} ${i < score ? "earned" : ""} ${i === score - 1 && state.result?.outcome === side ? "just-earned" : ""}" aria-hidden="true"></span>`).join(""); }
function scoreboard(m: Match): string { return `<section class="scoreboard" aria-label="Match score: You ${m.scores.player}, opponent ${m.scores.opponent}. First to ${m.target} points."><div class="score-side player"><span>You</span><strong>${m.scores.player}</strong><div class="score-pips">${pips(m.scores.player, "player")}</div></div><p>First to ${m.target}</p><div class="score-side opponent"><span>Opponent</span><strong>${m.scores.opponent}</strong><div class="score-pips">${pips(m.scores.opponent, "opponent")}</div></div></section>`; }
function callout(m: Match, r: MatchResult): string { const move = { power: "a driving throw", speed: "a lightning entry", technique: "clean technique", kumikata: "a dominant grip", newaza: "a tight turnover" }[r.stat]; return r.outcome === "draw" ? `${nameOf(m.player)} and ${nameOf(m.opponent)} are evenly matched in the exchange.` : `${nameOf(r.outcome === "player" ? m.player : m.opponent)} takes the point with ${move}.`; }
function historyStrip(): string { if (!state.history.length) return ""; return `<section class="match-history" aria-label="Round history">${eyebrow("Round history")}<ol>${state.history.map((h) => `<li class="${h.outcome}"><span>R${h.roundNumber}</span><strong>${labels[h.stat]}</strong><span>${h.outcome === "player" ? "WIN" : h.outcome === "opponent" ? "LOSS" : "DRAW"}</span></li>`).join("")}</ol></section>`; }
function championProgress(m: Match): string {
  if (m.mode !== "champion") return "";
  const details = matchSummary(m, state.history), record = details.championRecord!;
  const streak = details.championStreak ?? 0;
  return surface("section", "panel champion-progress", "Champion round progress", `${eyebrow("Champion run")}<dl><div><dt>Round-win streak</dt><dd>${streak} ${streak === 1 ? "round" : "rounds"}</dd></div><div><dt>Round record</dt><dd>${record.wins}–${record.losses}–${record.draws}</dd></div><div><dt>Opponents faced</dt><dd>${m.matchNumber}</dd></div></dl>`);
}
function summary(m: Match): string { if (m.phase !== "matchOver") return ""; const details = matchSummary(m, state.history); const progress = m.mode === "champion" ? `Run record: ${details.championRecord!.wins}–${details.championRecord!.losses}–${details.championRecord!.draws}` : `Points won: ${details.playerWins}`; const bestChoice = details.bestStat ? `${labels[details.bestStat]} · ${details.bestStatWins}/${details.bestStatSelections} ${details.bestStatWins === 1 ? "win" : "wins"}` : "No winning choice"; return surface("section", "panel match-summary", "Match summary", `${eyebrow("Match summary")}<dl><div><dt>Final score</dt><dd>${details.score}</dd></div><div><dt>Most used stat</dt><dd>${details.decisiveStat ? labels[details.decisiveStat] : "—"}</dd></div><div><dt>Best choice</dt><dd>${bestChoice}</dd></div><div><dt>${m.mode === "champion" ? "Champion progress" : "Match progress"}</dt><dd>${progress}</dd></div></dl>`); }
function resultPanel(m: Match, r: MatchResult): string {
  const title = m.phase === "matchOver" ? r.outcome === "draw" ? "MATCH DRAWN" : r.outcome === "player" ? "MATCH WON" : "MATCH LOST" : r.outcome === "draw" ? "NO POINT AWARDED" : r.outcome === "player" ? "POINT WON" : "POINT LOST";
  return surface("section", `panel result-panel outcome-${r.outcome}`, "Round result", `${eyebrow(title)}<p>You used <strong>${r.playerValue}</strong> in ${labels[r.stat]}. ${esc(nameOf(m.opponent))} had <strong>${r.opponentValue}</strong>.</p><p class="callout">${esc(callout(m, r))}</p>`);
}
function game(m: Match): string {
  const playerStrengths = strongestStats(m.player);
  const stats = STAT_KEYS.map((stat, i) => buttonChoice(labels[stat], String(i + 1), String(m.player.stats[stat]), `data-stat="${stat}"`, m.phase !== "selecting" || state.busy || Boolean(state.pendingStat), state.result?.stat === stat || state.pendingStat === stat, playerStrengths.includes(stat))).join("");
  const committing = state.pendingStat ? `<section class="commitment" aria-live="polite"><span class="block-cursor" aria-hidden="true">█</span><div><strong>Opponent commits…</strong><p>Resolving ${labels[state.pendingStat as StatKey]}.</p></div></section>` : "";
  const reveal = state.result ? `${resultPanel(m, state.result)}${summary(m)}` : "";
  const action = m.phase === "awaitingNext" ? primaryButton("next", "Next round", "Enter") : m.phase === "matchOver" ? `${primaryButton("replay", "Replay match", "Enter")}${quietButton("copy-seed", "Copy replay seed", "Copy")}<p class="replay-seed">Replay seed: <code>${esc(state.activeSeed)}</code></p>${state.seedMessage ? `<p class="seed-message" role="status">${esc(state.seedMessage)}</p>` : ""}` : "";
  const scout = state.result ? "" : surface("aside", "panel scout-report", "Scout report", `${eyebrow("Scout report")}<p>Opponent's likely strength: <strong>${strongestStats(m.opponent).map((stat) => labels[stat]).join(" / ")}</strong>. Choose your exchange carefully.</p>`);
  const opponent = state.result ? fighter(m.opponent, "opponent") : surface("section", "fighter-card opponent concealed", "Opponent concealed", `${eyebrow("Opponent")}<h2>Hidden judoka</h2><p>Revealed after your selection.</p>`);
  return `${scoreboard(m)}<section class="battle-layout"><div class="player-column">${fighter(m.player, "player")}${championProgress(m)}${scout}<section aria-label="Stat selection" class="stats">${stats}</section>${committing}${reveal}<div class="actions game-actions">${action}${quietButton("quit", m.phase === "matchOver" ? "Change settings" : "Quit match", "Esc / Q")}</div>${historyStrip()}</div>${opponent}</section>`;
}
function headerContext(): string {
  if (!state.match) return `${modeLabel()} · ${divisionLabel()} division · First to ${state.target}`;
  const full = `Round ${state.match.matchNumber} · ${modeLabel()} · ${divisionLabel()} · First to ${state.match.target} · You: ${state.match.scores.player} · Opponent: ${state.match.scores.opponent}`;
  const compact = `R${state.match.matchNumber} · ${divisionLabel()} · ${state.match.scores.player}–${state.match.scores.opponent} · FT${state.match.target}`;
  return `<span class="header-context-wide">${full}</span><span class="header-context-compact">${compact}</span>`;
}
function render(): void { 
  const hint = !state.match ? `${shortcutHint("A / W")} Division ${shortcutHint("1–3")} Length ${shortcutHint("Enter")} Start` : state.pendingStat ? "Resolving opponent…" : state.match.phase === "selecting" ? `${shortcutHint("1–5")} Choose a stat ${shortcutHint("Esc / Q")} Quit match` : state.match.phase === "awaitingNext" ? `${shortcutHint("Enter")} Next round ${shortcutHint("Esc / Q")} Quit match` : `${shortcutHint("Enter")} Play again ${shortcutHint("Esc / Q")} Change settings`; 
  const content = !state.match ? intro() : `<p id="status" class="active-command" role="status" aria-live="polite">${status()} <span class="block-cursor" aria-hidden="true">█</span></p>${game(state.match)}`; 
  root.innerHTML = `<header><div>bash - JU-DO-KON</div><p>${headerContext()}</p></header><main id="game" tabindex="-1" class="${!state.match ? "intro-main" : ""}">${content}</main><footer><span class="footer-hint">${hint}</span></footer>`; 
}
function start(points = state.target, seed = state.replaySeed.trim() || crypto.randomUUID()): void { 
  state.target = points; 
  state.lengthIndex = lengths.indexOf(points as typeof lengths[number]); 
  state.activeSeed = seed; 
  let hash = 0; 
  for (const c of state.activeSeed) hash = (hash * 31 + c.charCodeAt(0)) >>> 0; 
  state.activeWeight = state.division === "weight" ? state.weight === "random" ? weights[hash % weights.length] : state.weight : undefined; 
  state.pendingStat = null; 
  state.history = []; 
  state.result = null; 
  state.drawBuffer = []; 
  state.seedMessage = ""; 
  clearSavedMatch(); 
  persistPreferences(state); 
  void draw(); 
}
async function drawBatch(seed: string, count: number, minimum: number, exclude?: string[]): Promise<Judoka[]> {
  try { return await client.drawBatch(seed, count, state.activeWeight, exclude); }
  catch (error) {
    if (count > minimum && error instanceof Error && error.message.startsWith("No compatible")) return client.drawBatch(seed, minimum, state.activeWeight, exclude);
    throw error;
  }
}
async function draw(): Promise<void> { 
  state.busy = true; 
  state.result = null; 
  state.errorMessage = ""; 
  render(); 
  try { 
    const drawn = await drawBatch(state.activeSeed, DRAW_BUFFER_SIZE, 2); 
    const [a, b, ...remaining] = drawn; 
    state.match = createMatch(a!, b!, state.target, 1, { player: 0, opponent: 0 }, state.mode); 
    state.drawBuffer = remaining; 
    saveGameState(state); 
  } catch (e) { 
    state.match = null; 
    state.drawBuffer = []; 
    state.errorMessage = e instanceof Error && e.message.startsWith("No compatible") ? `${e.message}. Choose Absolute or another division.` : e instanceof Error ? `${e.message}. Check your connection and try again.` : "Unable to draw judoka. Please try again."; 
  } finally { 
    state.busy = false; 
    render(); 
  } 
}
async function next(m: Match): Promise<void> { 
  state.busy = true; 
  state.result = null; 
  state.errorMessage = ""; 
  render(); 
  try { 
    const matchSeed = `${state.activeSeed}:buffer:${m.matchNumber + 1}`; 
    if (m.mode === "champion") { 
      if (!state.drawBuffer.length) state.drawBuffer = await drawBatch(matchSeed, DRAW_BUFFER_SIZE - 1, 1, [m.player.id, m.opponent.id]); 
      state.match = nextMatch(m, m.player, state.drawBuffer.shift()!); 
    } else { 
      if (state.drawBuffer.length < 2) state.drawBuffer = await drawBatch(matchSeed, DRAW_BUFFER_SIZE, 2); 
      state.match = nextMatch(m, state.drawBuffer.shift()!, state.drawBuffer.shift()!); 
    } 
    saveGameState(state); 
  } catch (e) { 
    state.errorMessage = e instanceof Error ? `${e.message}. Try the next match again.` : "Unable to draw judoka. Please try again."; 
    saveGameState(state); 
  } finally { 
    state.busy = false; 
    render(); 
  } 
}
function choose(n: number): void { 
  state.target = n; 
  state.lengthIndex = lengths.indexOf(n as typeof lengths[number]); 
  render(); 
  root.querySelector<HTMLInputElement>(`[data-length="${n}"]`)?.focus(); 
}
function resolve(stat: StatKey): void { 
  if (!state.match || state.match.phase !== "selecting" || state.pendingStat) return; 
  state.pendingStat = stat; 
  render(); 
  window.setTimeout(() => { 
    if (!state.match || state.pendingStat !== stat) return; 
    state.result = selectStat(state.match, stat); 
    state.match = state.result.match; 
    state.history.push({ outcome: state.result.outcome, stat, roundNumber: state.match.matchNumber }); 
    state.pendingStat = null; 
    outcomeBeep(state.result.outcome); 
    saveGameState(state); 
    render(); 
    root.querySelector<HTMLButtonElement>("#next, #replay")?.focus(); 
  }, 650); 
}
async function copyReplaySeed(): Promise<void> { 
  try { 
    await navigator.clipboard.writeText(state.activeSeed); 
    state.seedMessage = "Replay seed copied."; 
  } catch { 
    state.seedMessage = "Could not copy the replay seed. Copy the value shown below."; 
  } 
  render(); 
}
root.addEventListener("click", (e) => {
  handleClickEvent(e, state, {
    start,
    copyReplaySeed,
    next,
    resolve,
    clearAndExit: () => {
      state.match = null;
      state.result = null;
      state.pendingStat = null;
      state.errorMessage = "";
      state.history = [];
      state.drawBuffer = [];
      clearSavedMatch();
      render();
    }
  });
});

root.addEventListener("change", (e) => {
  handleChangeEvent(e, state, root, {
    render,
    persistPreferences: () => persistPreferences(state),
    setSoundEnabled
  });
  
  const input = e.target as HTMLInputElement;
  if (input.dataset.length && input.checked) {
    choose(Number(input.dataset.length));
  }
});

root.addEventListener("toggle", handleToggleEvent, true);

document.addEventListener("keydown", (e) => {
  if ((e.target as HTMLElement).matches("input, select")) return;
  if (/^[1-5]$/.test(e.key) || ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Enter", " ", "Escape"].includes(e.key) || ["a", "w", "c", "h", "q"].includes(e.key.toLowerCase())) keyboardTick();
  
  if (!state.match) {
    handleIntroKeyboard(e, state, root, {
      choose,
      start,
      keyboardTick
    });
  } else {
    handleMatchKeyboard(e, state, root, {
      resolve,
      keyboardTick
    });
  }
});
render();
