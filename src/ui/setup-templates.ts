/**
 * Setup Screen Templates
 *
 * HTML generation for game mode selection, division choice, weight class selection, and match length configuration.
 */

import { actionGroup, primaryButton, quietButton, radioChoice, surface, terminalMenu, utilityButton } from "./controls";
import { type GameState } from "../state";
import { createHelpers, lengths, weights, type Helpers } from "./helpers";
import { getSoundEnabled } from "./helpers/soundStorage";
import { escapeHtml as esc } from "./utils/escapeHtml";
import { status } from "./helpers/status";
import { pointRule, tieRule } from "./constants";

export function footerUtilities(state: GameState): string {
  const soundEnabled = getSoundEnabled();
  const seedLabel = state.replaySeed ? `Replay seed: ${state.replaySeed}` : "Replay seed: Random";
  return `<div class="footer-utilities" role="group" aria-label="Game settings">${utilityButton("seed-button", seedLabel)}${utilityButton("sound-enabled", `Sound: ${soundEnabled ? "On" : "Off"}`, soundEnabled)}</div>`;
}

export function seedDialog(state: GameState): string {
  const dialog = state.seedModalOpen
    ? `<div class="modal-backdrop"><section class="panel seed-dialog" role="dialog" aria-modal="true" aria-labelledby="seed-dialog-title"><p class="eyebrow">Replay setup</p><h2 id="seed-dialog-title">Set a replay seed</h2><p>Use the same seed to replay the same matchups, as long as the Budokon judoka catalogue has not changed.</p><label for="replay-seed">Replay seed<input id="replay-seed" value="${esc(state.seedDraft ?? state.replaySeed)}" placeholder="Leave blank for a fresh matchup" autocomplete="off" spellcheck="false" /></label>${actionGroup(`${quietButton("cancel-seed", "Cancel", "Esc")}${primaryButton("save-seed", "Use seed", "Enter")}`, { label: "Replay seed actions", className: "dialog-actions" })}</section></div>`
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
    description: "Match with judoka near your weight", shortcut: "W", checked: state.division === "weight", active: cursor === 1,
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
  return `<div class="setup-summary"><span>${esc(label)}: <strong>${esc(value)}</strong></span><button type="button" class="control control--quiet quiet setup-change" data-setup-step="${target}">Change</button></div>`;
}

function setupAction(content: string): string {
  return actionGroup(content, { label: "Setup actions", className: "setup-actions", mobileSticky: true });
}

function setupProgress(state: GameState, step: NonNullable<GameState["setupStep"]>): string {
  const steps: string[] = state.division === "weight"
    ? ["mode", "division", "weight", "length"]
    : ["mode", "division", "length"];
  const index = Math.max(steps.indexOf(step), 0) + 1;
  const segments = steps.map((_, segmentIndex) => {
    const stateClass = segmentIndex === index - 1 ? " is-current" : segmentIndex < index - 1 ? " is-complete" : "";
    return `<span class="setup-progress-segment${stateClass}" aria-hidden="true"></span>`;
  }).join("");
  return `<div class="setup-progress"><span class="setup-progress-text">Step ${index} of ${steps.length}</span><div class="setup-progress-track" role="progressbar" aria-label="Match setup progress" aria-valuemin="1" aria-valuemax="${steps.length}" aria-valuenow="${index}" aria-valuetext="Step ${index} of ${steps.length}">${segments}</div></div>`;
}

function setupPanel(state: GameState, helpers: Helpers): string {
  const step = state.setupStep ?? "mode";
  const cursor = state.setupCursor ?? 0;
  if (step === "mode") {
    const hint = state.mode === "champion"
      ? "Keep your judoka in the fight and build a streak."
      : "Meet a fresh opponent every round.";
    return `${setupProgress(state, step)}<fieldset class="setup-group setup-stage"><legend>Choose game mode</legend>${terminalMenu(modeChoices(state, cursor))}<small>${hint}</small></fieldset>`;
  }
  if (step === "division") {
    return `${setupSummary("Game mode", helpers.modeLabel(), "mode")}${setupProgress(state, step)}<fieldset class="setup-group setup-stage"><legend>Choose division</legend>${terminalMenu(divisionChoices(state, cursor))}</fieldset>`;
  }
  if (step === "weight") {
    const options = [
      `<option value="random" ${state.weight === "random" ? "selected" : ""}>Random weight class</option>`,
      ...weights.map((weight) => `<option value="${weight}" ${state.weight === weight ? "selected" : ""}>${weight} kg</option>`)
    ].join("");
    return `${setupSummary("Game mode", helpers.modeLabel(), "mode")}${setupSummary("Division", "Weight class", "division")}${setupProgress(state, step)}<fieldset class="setup-group setup-stage"><legend>Choose weight class</legend><label class="weight-picker" for="weight-class"><span>Match by weight class</span><select id="weight-class">${options}</select></label>${setupAction(primaryButton("confirm-weight", "Continue", "Enter"))}</fieldset>`;
  }

  return `${setupSummary("Game mode", helpers.modeLabel(), "mode")}${setupSummary("Division", helpers.divisionLabel(), "division")}${setupProgress(state, step)}<fieldset class="setup-group setup-stage"><legend>Choose match length</legend>${terminalMenu(lengthChoices(state, cursor))}</fieldset><p class="setup-rule"><strong>${pointRule}</strong> ${tieRule}</p><p class="start-context">First to ${state.target} points</p>${setupAction(primaryButton("start", "Start match", "Enter", state.busy))}`;
}

/**
 * Generate intro screen HTML
 */
export function intro(state: GameState): string {
  const helpers = createHelpers(state);
  const step = state.setupStep ?? "mode";
  const statusMessage = status(state);
  return `<section class="intro" data-setup-step="${step}" aria-labelledby="intro-title"><div class="intro-copy"><p class="eyebrow">Choose your challenge</p><h1 id="intro-title">Step into the <br/>judoka circuit.</h1><p class="intro-lede">Pick a game mode, then choose one of your judoka’s stats each round. ${pointRule}</p><p class="intro-status" role="status">${esc(statusMessage)}<span class="block-cursor" aria-hidden="true">█</span></p></div>${surface("section", "intro-mode-panel", "Match setup", `${helpers.eyebrow("Match setup")}${setupPanel(state, helpers)}`)}<p class="intro-footnote">Your last setup will be waiting here next time.</p></section>`;
}
