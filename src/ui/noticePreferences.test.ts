import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getNoticeDuration, saveNoticeDuration } from "./noticePreferences";

describe("notification duration preference", () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
  });

  it("defaults to normal timing and reads supported saved values", () => {
    expect(getNoticeDuration()).toBe("normal");

    for (const duration of ["normal", "long", "manual"] as const) {
      localStorage.setItem("judokon.noticeDuration", duration);
      expect(getNoticeDuration()).toBe(duration);
    }
  });

  it("treats unknown saved values as normal timing", () => {
    localStorage.setItem("judokon.noticeDuration", "instant");

    expect(getNoticeDuration()).toBe("normal");
  });

  it("defaults to normal timing when storage cannot be read", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("storage unavailable");
    });

    expect(getNoticeDuration()).toBe("normal");
  });

  it("persists duration changes", () => {
    saveNoticeDuration("manual");

    expect(localStorage.getItem("judokon.noticeDuration")).toBe("manual");
  });

  it("does not throw when storage is unavailable", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("storage unavailable");
    });

    expect(() => saveNoticeDuration("long")).not.toThrow();
  });
});
