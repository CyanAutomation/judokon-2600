/**
 * Container Components
 * 
 * Layout wrapper components for sections, aside panels, and menu shells.
 */

import { escapeHtml } from "./utils/escapeHtml";

export type DefinitionListItem = { label: string; value: string };
export type ValueListItem = { label: string; value: string; className?: string; valueClassName?: string };

/** Small reusable label rendered as a compact status or category marker. */
export function badge(label: string, className = ""): string {
  const classes = ["badge", className].filter(Boolean).map(escapeHtml).join(" ");
  return `<span class="${classes}">${escapeHtml(label)}</span>`;
}

/** Consistent labeled-value list used by result and progress panels. */
export function definitionList(items: readonly DefinitionListItem[], className = ""): string {
  const classes = ["definition-list", className].filter(Boolean).map(escapeHtml).join(" ");
  const entries = items.map(({ label, value }) => `<div><dt>${escapeHtml(label)}</dt><dd>${escapeHtml(value)}</dd></div>`).join("");
  return `<dl class="${classes}">${entries}</dl>`;
}

/** Compact reusable list for repeated label and value pairs such as fighter stats. */
export function valueList(items: readonly ValueListItem[], className = "", label?: string): string {
  const classes = ["value-list", className].filter(Boolean).map(escapeHtml).join(" ");
  const accessibleLabel = label ? ` aria-label="${escapeHtml(label)}"` : "";
  const entries = items.map(({ label: itemLabel, value, className: itemClass = "", valueClassName = "" }) =>
    `<li class="${escapeHtml(itemClass)}"><span>${escapeHtml(itemLabel)}</span><strong class="${escapeHtml(valueClassName)}">${escapeHtml(value)}</strong></li>`
  ).join("");
  return `<ul class="${classes}"${accessibleLabel}>${entries}</ul>`;
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
