import type { NoticeDuration } from "./noticeTypes";

const DURATION_KEY = "judokon.noticeDuration";

export function getNoticeDuration(): NoticeDuration {
  try {
    const value = localStorage.getItem(DURATION_KEY);
    return value === "long" || value === "manual" ? value : "normal";
  } catch {
    return "normal";
  }
}

export function saveNoticeDuration(value: NoticeDuration): void {
  try {
    localStorage.setItem(DURATION_KEY, value);
  } catch {
    // The current session still honors the selected preference.
  }
}
