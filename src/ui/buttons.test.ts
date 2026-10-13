import { describe, expect, it } from "vitest";
import { primaryButton, quietButton, shortcutHint } from "./buttons";

describe("buttons", () => {
  it("renders the keyboard shortcut as decorative text", () => {
    const markup = shortcutHint("Enter");
    expect(markup).toContain("<kbd>Enter</kbd>");
    expect(markup).toContain('aria-hidden="true"');
  });

  it("primaryButton includes shortcut hint and disabled attribute", () => {
    const enabled = primaryButton("next", "Next", "Enter", false);
    expect(enabled).not.toContain("disabled");
    expect(enabled).toContain("<kbd>Enter</kbd>");

    const disabled = primaryButton("next", "Next", "Enter", true);
    expect(disabled).toContain("disabled");
  });

  it("shows a quiet button's label and keyboard shortcut", () => {
    const root = document.createElement("div");
    root.innerHTML = quietButton("copy", "Copy", "Ctrl+C");
    const button = root.querySelector<HTMLButtonElement>("#copy");

    expect(button?.textContent).toContain("Copy");
    expect(button?.querySelector("kbd")?.textContent).toBe("Ctrl+C");
  });
});
