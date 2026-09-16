/**
 * Button Components
 * 
 * Primary action button, quiet secondary button, and shortcut hint badge components.
 */

import { escapeHtml } from "./utils/escapeHtml";

export function shortcutHint(keys: string): string {
  return `<span class="badge shortcut-hint" aria-hidden="true"><kbd>${escapeHtml(keys)}</kbd></span>`;
}

export function primaryButton(id: string, label: string, shortcut: string, disabled = false): string {
  return `<button class="control control--primary action-button primary-action" id="${escapeHtml(id)}" ${disabled ? "disabled" : ""}><span>${escapeHtml(label)}</span>${shortcutHint(shortcut)}</button>`;
}

export function quietButton(id: string, label: string, shortcut: string): string {
  return `<button class="control control--quiet action-button quiet" id="${escapeHtml(id)}"><span>${escapeHtml(label)}</span>${shortcutHint(shortcut)}</button>`;
}
