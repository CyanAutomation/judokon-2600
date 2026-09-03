export type RadioChoice = {
  id: string;
  name: string;
  label: string;
  description: string;
  shortcut: string;
  checked: boolean;
  disabled?: boolean;
  data?: Record<string, string>;
};

export const escapeHtml = (value: string): string => value.replace(/[&<>"']/g, (character) => ({
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#039;"
})[character]!);

const attributes = (values: Record<string, string> = {}): string => Object.entries(values)
  .map(([name, value]) => ` ${escapeHtml(name)}="${escapeHtml(value)}"`)
  .join("");

export function shortcutHint(keys: string): string { return `<span class="badge shortcut-hint" aria-hidden="true"><kbd>${escapeHtml(keys)}</kbd></span>`; }
export function primaryButton(id: string, label: string, shortcut: string, disabled = false): string { return `<button class="action-button primary-action" id="${escapeHtml(id)}" ${disabled ? "disabled" : ""}><span>${escapeHtml(label)}</span>${shortcutHint(shortcut)}</button>`; }
export function quietButton(id: string, label: string, shortcut: string): string { return `<button class="action-button quiet" id="${escapeHtml(id)}"><span>${escapeHtml(label)}</span>${shortcutHint(shortcut)}</button>`; }
export function buttonChoice(label: string, shortcut: string, value: string, data: string, disabled: boolean, selected = false, strongest = false): string { return `<button class="action-button option-card ${selected ? "is-selected" : ""} ${strongest ? "is-strongest" : ""}" ${data} ${disabled ? "disabled" : ""}><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong>${strongest ? "<em>Strongest</em>" : ""}${shortcutHint(shortcut)}</button>`; }

/** A visual card backed by a native radio input for one-of-many setup choices. */
export function radioChoice({ id, name, label, description, shortcut, checked, disabled = false, data }: RadioChoice): string {
  return `<label class="choice-card ${checked ? "is-selected" : ""}" for="${escapeHtml(id)}"><input class="choice-input" id="${escapeHtml(id)}" name="${escapeHtml(name)}" type="radio"${attributes(data)} ${checked ? "checked" : ""} ${disabled ? "disabled" : ""}/><span class="choice-label">${escapeHtml(label)}</span><small>${escapeHtml(description)}</small>${shortcutHint(shortcut)}</label>`;
}
