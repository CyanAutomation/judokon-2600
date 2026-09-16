import { describe, expect, it } from "vitest";
import { primaryButton, quietButton, shortcutHint } from "./buttons";

describe("buttons", () => {
  it("shortcutHint renders a badge with keyboard shortcut", () => {
    const markup = shortcutHint("Enter");
    expect(markup).toContain('class="badge shortcut-hint"');
    expect(markup).toContain("<kbd>Enter</kbd>");
    expect(markup).toContain('aria-hidden="true"');
  });

  it("uses the shared control primitive for every button variant", () => {
    expect(primaryButton("start", "Start match", "Enter")).toContain(
      'class="control control--primary action-button primary-action"'
    );
    expect(quietButton("quit", "Quit", "Q")).toContain('class="control control--quiet action-button quiet"');
  });

  it("primaryButton includes shortcut hint and disabled attribute", () => {
    const enabled = primaryButton("next", "Next", "Enter", false);
    expect(enabled).not.toContain("disabled");
    expect(enabled).toContain("<kbd>Enter</kbd>");

    const disabled = primaryButton("next", "Next", "Enter", true);
    expect(disabled).toContain("disabled");
  });

  it("quietButton renders without disabled state", () => {
    const markup = quietButton("copy", "Copy", "Ctrl+C");
    expect(markup).toContain('class="control control--quiet action-button quiet"');
    expect(markup).toContain("<kbd>Ctrl+C</kbd>");
  });
});
