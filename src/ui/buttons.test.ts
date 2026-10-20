import { describe, expect, it } from "vitest";
import { primaryButton, quietButton } from "./buttons";

describe("buttons", () => {
  it("shows the keyboard hint visually and exposes it to assistive technology", () => {
    const root = document.createElement("div");
    root.innerHTML = primaryButton("next-enabled", "Next", "Enter", false)
      + primaryButton("next-disabled", "Next", "Enter", true);
    const enabled = root.querySelector<HTMLButtonElement>("#next-enabled");
    const disabled = root.querySelector<HTMLButtonElement>("#next-disabled");

    expect(enabled?.disabled).toBe(false);
    expect(disabled?.disabled).toBe(true);
    expect(enabled?.querySelector("kbd")?.textContent).toBe("Enter");
    expect(enabled?.querySelector("kbd")?.closest(".shortcut-hint")?.getAttribute("aria-hidden")).toBe("true");
    expect(enabled?.querySelector(".visually-hidden")?.textContent).toContain("Shortcut: Enter");
  });

  it("shows a quiet button's label and keyboard shortcut", () => {
    const root = document.createElement("div");
    root.innerHTML = quietButton("copy", "Copy", "Ctrl+C");
    const button = root.querySelector<HTMLButtonElement>("#copy");

    expect(button?.textContent).toContain("Copy");
    expect(button?.querySelector("kbd")?.textContent).toBe("Ctrl+C");
    expect(button?.querySelector(".visually-hidden")?.textContent).toContain("Shortcut: Ctrl+C");
  });
});
