/**
 * Container Components
 * 
 * Layout wrapper components for sections, aside panels, and menu shells.
 */

import { escapeHtml } from "./utils/escapeHtml";

type SurfaceOptions = {
  ariaLive?: "off" | "polite" | "assertive";
};

export function surface(tag: "aside" | "section", classes: string, label: string, content: string, options: SurfaceOptions = {}): string {
  const liveRegion = options.ariaLive ? ` aria-live="${options.ariaLive}"` : "";
  return `<${tag} class="surface panel ${escapeHtml(classes)}" aria-label="${escapeHtml(label)}"${liveRegion}>${content}</${tag}>`;
}

/** Shared one-column menu shell for every staged setup decision. */
export function terminalMenu(content: string): string {
  return `<div class="terminal-menu" role="radiogroup">${content}</div><p class="menu-help"><span aria-hidden="true">↑ ↓</span><span>Use the arrow keys or tap a choice. Press Enter to choose.</span></p>`;
}
