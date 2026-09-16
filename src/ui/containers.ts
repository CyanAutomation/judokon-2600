/**
 * Container Components
 * 
 * Layout wrapper components for sections, aside panels, and menu shells.
 */

import { escapeHtml } from "./controls";

export function surface(tag: "aside" | "section", classes: string, label: string, content: string): string {
  return `<${tag} class="surface panel ${escapeHtml(classes)}" aria-label="${escapeHtml(label)}">${content}</${tag}>`;
}

/** Shared one-column menu shell for every staged setup decision. */
export function terminalMenu(content: string): string {
  return `<div class="terminal-menu" role="radiogroup">${content}</div><p class="menu-help"><span aria-hidden="true">↑ ↓</span> move <span aria-hidden="true">·</span> Enter select</p>`;
}
