/**
 * Sound Storage Utility
 *
 * Centralized localStorage management for sound enabled state.
 */

const KEY = "judokon.soundEnabled";

/**
 * Read the sound enabled flag from localStorage
 */
export function getSoundEnabled(): boolean {
  return localStorage.getItem(KEY) === "true";
}

/**
 * Persist the sound enabled flag to localStorage
 */
export function setSoundEnabledPersisted(enabled: boolean): void {
  localStorage.setItem(KEY, String(enabled));
}
