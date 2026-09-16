/**
 * HTML Escaping Utility
 * 
 * Security-critical function for escaping special HTML characters
 * to prevent XSS vulnerabilities.
 */

export const escapeHtml = (value: string): string =>
  value.replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
  })[character]!);
