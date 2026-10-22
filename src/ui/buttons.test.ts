import { describe, expect, it } from "vitest";
import { actionGroup, primaryButton, quietButton } from "./buttons";

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

  it("provides a shared accessible action group with an optional mobile-sticky treatment", () => {
    const root = document.createElement("div");
    root.innerHTML = actionGroup(primaryButton("start", "Start match", "Enter"), {
      label: "Setup actions",
      className: "setup-actions",
      mobileSticky: true,
    });
    const group = root.querySelector<HTMLElement>(".action-group");

    expect(group?.getAttribute("role")).toBe("group");
    expect(group?.getAttribute("aria-label")).toBe("Setup actions");
    expect(group?.classList.contains("setup-actions")).toBe(true);
    expect(group?.classList.contains("action-group--mobile-sticky")).toBe(true);
    expect(group?.querySelector("#start")).not.toBeNull();
  });
});
