/**
 * Input/Choice Components
 * 
 * Radio choice cards and button choice options for setup and stat selection.
 */

import { escapeHtml } from "./utils/escapeHtml";

export type RadioChoice = {
  id: string;
  name: string;
  label: string;
  compactLabel?: string;
  description: string;
  shortcut: string;
  checked: boolean;
  active?: boolean;
  disabled?: boolean;
  data?: Record<string, string>;
};

const attributes = (values: Record<string, string> = {}): string =>
  Object.entries(values)
    .map(([name, value]) => ` ${escapeHtml(name)}="${escapeHtml(value)}"`)
    .join("");

export function buttonChoice(
  label: string,
  shortcut: string,
  value: string,
  data: string,
  disabled: boolean,
  selected = false,
  strongest = false
): string {
  return `<button class="control control--choice action-button option-card ${selected ? "is-selected" : ""} ${strongest ? "is-strongest" : ""}" ${data} ${disabled ? "disabled" : ""}${selected ? ' aria-current="true"' : ""}><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong>${strongest ? "<em>Strongest</em>" : ""}<span class="badge shortcut-hint" aria-hidden="true"><kbd>${escapeHtml(shortcut)}</kbd></span></button>`;
}

export function utilityButton(id: string, label: string, pressed?: boolean): string {
  return `<button class="control control--utility utility-button" id="${escapeHtml(id)}"${pressed === undefined ? "" : ` aria-pressed="${pressed}"`}><span>${escapeHtml(label)}</span></button>`;
}

/** A visual card backed by a native radio input for one-of-many setup choices. */
export function radioChoice({
  id,
  name,
  label,
  compactLabel,
  description,
  shortcut,
  checked,
  active = false,
  disabled = false,
  data,
}: RadioChoice): string {
  const choiceLabel = compactLabel
    ? `<span class="choice-label-full">${escapeHtml(label)}</span><span class="choice-label-compact" aria-hidden="true">${escapeHtml(compactLabel)}</span>`
    : escapeHtml(label);
  return `<label class="choice-card ${checked ? "is-selected" : ""} ${active ? "is-active" : ""}" for="${escapeHtml(id)}"><span class="menu-caret" aria-hidden="true">${active ? ">" : "&nbsp;"}</span><input class="choice-input" id="${escapeHtml(id)}" name="${escapeHtml(name)}" type="radio"${attributes(data)} ${checked ? "checked" : ""} ${disabled ? "disabled" : ""}/><span class="choice-label">${choiceLabel}</span><small>${escapeHtml(description)}</small><span class="badge shortcut-hint" aria-hidden="true"><kbd>${escapeHtml(shortcut)}</kbd></span></label>`;
}
