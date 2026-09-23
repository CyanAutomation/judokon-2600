/**
 * Setup Screen Templates
 *
 * HTML generation for game mode selection, division choice, weight class selection, and match length configuration.
 */

import { primaryButton, quietButton, radioChoice, terminalMenu, utilityButton } from "./controls";
import { type GameState } from "../state";
import { createHelpers, lengths, weights } from "./helpers";
import { getSoundEnabled } from "./helpers/soundStorage";
import { escapeHtml as esc } from "./utils/escapeHtml";

/**
 * Generate advanced options section
 */
export function advanced(state: GameState): string {
  const soundEnabled = getSoundEnabled();
  const seedLabel = state.replaySeed ? `Seed: ${state.replaySeed}` : "Seed: Random";
  const dialog = state.seedModalOpen
    ? `<div class="modal-backdrop"><section class="panel seed-dialog" role="dialog" aria-modal="true" aria-labelledby="seed-dialog-title"><p class="eyebrow">Replay setup</p><h2 id="seed-dialog-title">Set replay seed</h2><p>Use the same seed to replay a matchup.</p><label for="replay-seed">Seed<input id="replay-seed" value="${esc(state.seedDraft ?? state.replaySeed)}" placeholder="Leave blank for a fresh draw" autocomplete="off" spellcheck="false" /></label><div class="dialog-actions">${quietButton("cancel-seed", "Cancel", "Esc")}${primaryButton("save-seed", "Use seed", "Enter")}</div></section></div>`
    : "";
  return `<div class="footer-utilities" aria-label="Match utilities">${utilityButton("seed-button", seedLabel)}${utilityButton("sound-enabled", `Sound: ${soundEnabled ? "On" : "Off"}`, soundEnabled)}</div>${dialog}`;
}

/**
 * Generate intro screen HTML
 */
export function intro(state: GameState): string {
  const helpers = createHelpers(state);
  const step = state.setupStep ?? "mode";
  const cursor = state.setupCursor ?? 0;
  const divisionOptions = radioChoice({ id: "division-absolute", name: "division", label: "Absolute", description: "Open weight", shortcut: "A", checked: false, active: step === "division" && cursor === 0, data: { "data-division": "absolute" } })
    + radioChoice({ id: "division-weight", name: "division", label: "Weight class", compactLabel: "Weight", description: "Comparable division", shortcut: "W", checked: false, active: step === "division" && cursor === 1, data: { "data-division": "weight" } });
  const modeOptions = radioChoice({ id: "mode-classic", name: "game-mode", label: "Classic Battle", compactLabel: "Classic", description: "Fresh matchups", shortcut: "C", checked: false, active: step === "mode" && cursor === 0, data: { "data-intro-mode": "classic" } })
    + radioChoice({ id: "mode-champion", name: "game-mode", label: "Champion", description: "Build a streak", shortcut: "H", checked: false, active: step === "mode" && cursor === 1, data: { "data-intro-mode": "champion" } });
  const select = lengths.map((n, i) => radioChoice({ id: `length-${n}`, name: "match-length", label: ["Quick", "Medium", "Long"][i]!, description: `First to ${n}`, shortcut: String(i + 1), checked: state.lengthIndex === i, active: step === "length" && cursor === i, disabled: state.busy, data: { "data-length": String(n) } })).join("");
  const options = [`<option value="random" ${state.weight === "random" ? "selected" : ""}>Random weight class</option>`, ...weights.map((n) => `<option value="${n}" ${state.weight === n ? "selected" : ""}>${n} kg</option>`)].join("");
  const summary = (label: string, value: string, target: "mode" | "division") => `<div class="setup-summary"><span>${esc(label)}: <strong>${esc(value)}</strong></span><button class="quiet setup-change" data-setup-step="${target}">Change</button></div>`;
  const panel = step === "mode"
    ? `<fieldset class="setup-group setup-stage"><legend>Choose game mode</legend>${terminalMenu(modeOptions)}<small>${state.mode === "champion" ? "Keep one judoka in the fight and build a streak." : "Draw fresh opponents for every round."}</small></fieldset>`
    : step === "division"
      ? `${summary("Game mode", helpers.modeLabel(), "mode")}<fieldset class="setup-group setup-stage"><legend>Choose division</legend>${terminalMenu(divisionOptions)}</fieldset>`
      : step === "weight"
        ? `${summary("Game mode", helpers.modeLabel(), "mode")}${summary("Division", "Weight class", "division")}<fieldset class="setup-group setup-stage"><legend>Choose weight class</legend><label class="weight-picker" for="weight-class"><span>Match competitors by weight</span><select id="weight-class">${options}</select></label>${primaryButton("confirm-weight", "Continue", "Enter")}</fieldset>`
        : `${summary("Game mode", helpers.modeLabel(), "mode")}${summary("Division", helpers.divisionLabel(), "division")}<fieldset class="setup-group setup-stage"><legend>Choose match length</legend>${terminalMenu(select)}</fieldset><p class="setup-rule"><strong>Higher stat wins the point.</strong> Draws score no points.</p><p class="start-context">First to ${state.target} points</p>${primaryButton("start", "Start match", "Enter", state.busy)}`;
  return `<section class="intro" aria-labelledby="intro-title"><div class="intro-copy"><p class="eyebrow">Budokon terminal · 2600</p><h1 id="intro-title">Enter the<br/>judoka circuit.</h1><p class="intro-lede">Choose your format, then read the opponent and build a run one point at a time.</p><p class="intro-status" role="status">System ready. Configure your match<span class="block-cursor" aria-hidden="true">█</span></p></div><section class="intro-mode-panel panel" aria-label="Match setup">${helpers.eyebrow("Match setup")}${panel}</section><p class="intro-footnote">Setup unfolds one choice at a time.</p></section>`;
}
