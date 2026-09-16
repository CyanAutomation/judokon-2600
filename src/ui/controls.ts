/**
 * Control Components Barrel
 * 
 * Re-exports all UI control components (buttons, inputs, containers) and the escapeHtml security utility.
 */

// Security-critical HTML escaping utility
export const escapeHtml = (value: string): string =>
  value.replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
  })[character]!);

// Re-export button components
export { shortcutHint, primaryButton, quietButton } from "./buttons";

// Re-export input/choice components
export { type RadioChoice, buttonChoice, utilityButton, radioChoice } from "./inputs";

// Re-export container components
export { surface, terminalMenu } from "./containers";
