/**
 * Container Components
 * 
 * Layout wrapper components for sections, aside panels, and menu shells.
 */

import { escapeHtml } from "./utils/escapeHtml";

export type DefinitionListItem = { label: string; value: string };

/** Consistent labeled-value list used by result and progress panels. */
export function definitionList(items: readonly DefinitionListItem[], className = ""): string {
  const classes = ["definition-list", className].filter(Boolean).map(escapeHtml).join(" ");
  const entries = items.map(({ label, value }) => `<div><dt>${escapeHtml(label)}</dt><dd>${escapeHtml(value)}</dd></div>`).join("");
  return `<dl class="${classes}">${entries}</dl>`;
}

type SurfaceOptions = {
  ariaLive?: "off" | "polite" | "assertive";
};

export function surface(tag: "aside" | "section", classes: string, label: string, content: string, options: SurfaceOptions = {}): string {
  const liveRegion = options.ariaLive ? ` aria-live="${options.ariaLive}"` : "";
  return `<${tag} class="surface panel ${escapeHtml(classes)}" aria-label="${escapeHtml(label)}"${liveRegion}>${content}</${tag}>`;
}

/** Shared one-column menu shell for every staged setup decision. */
export function terminalMenu(content: string): string {
  return `<div class="terminal-menu" role="radiogroup">${content}</div><p class="menu-help"><span class="menu-help__keys" aria-hidden="true">↑ ↓</span><span class="menu-help__keyboard">Use the arrow keys or tap a choice. Press Enter to choose.</span><span class="menu-help__touch">Tap a choice to continue.</span></p>`;
}
