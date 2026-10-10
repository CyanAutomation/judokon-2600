/**
 * Setup Screen Templates
 *
 * HTML generation for game mode selection, division choice, weight class selection, and match length configuration.
 */

import { primaryButton, quietButton, radioChoice, terminalMenu, utilityButton } from "./controls";
import { type GameState } from "../state";
import { createHelpers, lengths, weights, type Helpers } from "./helpers";
import { getSoundEnabled } from "./helpers/soundStorage";
import { escapeHtml as esc } from "./utils/escapeHtml";

export function footerUtilities(state: GameState): string {
  const soundEnabled = getSoundEnabled();
  const seedLabel = state.replaySeed ? `Seed: ${state.replaySeed}` : "Seed: Random";
  return `<div class="footer-utilities" role="group" aria-label="Match utilities">${utilityButton("seed-button", seedLabel)}${utilityButton("sound-enabled", `Sound: ${soundEnabled ? "On" : "Off"}`, soundEnabled)}</div>`;
}

export function seedDialog(state: GameState): string {
  const dialog = state.seedModalOpen
    ? `<div class="modal-backdrop"><section class="panel seed-dialog" role="dialog" aria-modal="true" aria-labelledby="seed-dialog-title"><p class="eyebrow">Replay setup</p><h2 id="seed-dialog-title">Set replay seed</h2><p>The same seed reproduces draws while the Budokon catalogue version stays the same.</p><label for="replay-seed">Seed<input id="replay-seed" value="${esc(state.seedDraft ?? state.replaySeed)}" placeholder="Leave blank for a fresh draw" autocomplete="off" spellcheck="false" /></label><div class="dialog-actions">${quietButton("cancel-seed", "Cancel", "Esc")}${primaryButton("save-seed", "Use seed", "Enter")}</div></section></div>`
    : "";
  return dialog;
}

/**
 * Generate advanced options section
 */
export function advanced(state: GameState): string {
  return `${footerUtilities(state)}${seedDialog(state)}`;
}

function modeChoices(state: GameState, cursor: number): string {
  const classic = radioChoice({
    id: "mode-classic", name: "game-mode", label: "Classic Battle", compactLabel: "Classic",
    description: "Fresh matchups", shortcut: "C", checked: state.mode === "classic", active: cursor === 0,
    data: { "data-intro-mode": "classic" }
  });
  const champion = radioChoice({
    id: "mode-champion", name: "game-mode", label: "Champion", description: "Build a streak",
    shortcut: "H", checked: state.mode === "champion", active: cursor === 1,
    data: { "data-intro-mode": "champion" }
  });
  return classic + champion;
}

function divisionChoices(state: GameState, cursor: number): string {
  const absolute = radioChoice({
    id: "division-absolute", name: "division", label: "Absolute", description: "Open weight",
    shortcut: "A", checked: state.division === "absolute", active: cursor === 0,
    data: { "data-division": "absolute" }
  });
  const weight = radioChoice({
    id: "division-weight", name: "division", label: "Weight class", compactLabel: "Weight",
    description: "Comparable division", shortcut: "W", checked: state.division === "weight", active: cursor === 1,
    data: { "data-division": "weight" }
  });
  return absolute + weight;
}

function lengthChoices(state: GameState, cursor: number): string {
  return lengths.map((points, index) => radioChoice({
    id: `length-${points}`,
    name: "match-length",
    label: ["Quick", "Medium", "Long"][index]!,
    description: `First to ${points}`,
    shortcut: String(index + 1),
    checked: state.lengthIndex === index,
    active: cursor === index,
    disabled: state.busy,
    data: { "data-length": String(points) }
  })).join("");
}

function setupSummary(label: string, value: string, target: "mode" | "division"): string {
  return `<div class="setup-summary"><span>${esc(label)}: <strong>${esc(value)}</strong></span><button class="quiet setup-change" data-setup-step="${target}">Change</button></div>`;
}

function setupPanel(state: GameState, helpers: Helpers): string {
  const step = state.setupStep ?? "mode";
  const cursor = state.setupCursor ?? 0;
  if (step === "mode") {
    const hint = state.mode === "champion"
      ? "Keep one judoka in the fight and build a streak."
      : "Draw fresh opponents for every round.";
    return `<fieldset class="setup-group setup-stage"><legend>Choose game mode</legend>${terminalMenu(modeChoices(state, cursor))}<small>${hint}</small></fieldset>`;
  }
  if (step === "division") {
    return `${setupSummary("Game mode", helpers.modeLabel(), "mode")}<fieldset class="setup-group setup-stage"><legend>Choose division</legend>${terminalMenu(divisionChoices(state, cursor))}</fieldset>`;
  }
  if (step === "weight") {
    const options = [
      `<option value="random" ${state.weight === "random" ? "selected" : ""}>Random weight class</option>`,
      ...weights.map((weight) => `<option value="${weight}" ${state.weight === weight ? "selected" : ""}>${weight} kg</option>`)
    ].join("");
    return `${setupSummary("Game mode", helpers.modeLabel(), "mode")}${setupSummary("Division", "Weight class", "division")}<fieldset class="setup-group setup-stage"><legend>Choose weight class</legend><label class="weight-picker" for="weight-class"><span>Match competitors by weight</span><select id="weight-class">${options}</select></label>${primaryButton("confirm-weight", "Continue", "Enter")}</fieldset>`;
  }

  return `${setupSummary("Game mode", helpers.modeLabel(), "mode")}${setupSummary("Division", helpers.divisionLabel(), "division")}<fieldset class="setup-group setup-stage"><legend>Choose match length</legend>${terminalMenu(lengthChoices(state, cursor))}</fieldset><p class="setup-rule"><strong>Higher stat wins the point.</strong> Draws score no points.</p><p class="start-context">First to ${state.target} points</p>${primaryButton("start", "Start match", "Enter", state.busy)}`;
}

/**
 * Generate intro screen HTML
 */
export function intro(state: GameState): string {
  const helpers = createHelpers(state);
  const statusMessage = state.busy
    ? "Drawing judoka…"
    : state.errorMessage || "System ready. Configure your match";
  return `<section class="intro" aria-labelledby="intro-title"><div class="intro-copy"><p class="eyebrow">Budokon terminal · 2600</p><h1 id="intro-title">Enter the<br/>judoka circuit.</h1><p class="intro-lede">Choose your format, then read the opponent and build a run one point at a time.</p><p class="intro-status" role="status">${esc(statusMessage)}<span class="block-cursor" aria-hidden="true">█</span></p></div><section class="intro-mode-panel panel" aria-label="Match setup">${helpers.eyebrow("Match setup")}${setupPanel(state, helpers)}</section><p class="intro-footnote">Setup unfolds one choice at a time.</p></section>`;
}
