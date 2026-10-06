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

  it("quietButton renders its label and shortcut without a disabled state", () => {
    const markup = quietButton("copy", "Copy", "Ctrl+C");
    expect(markup).toContain('id="copy"');
    expect(markup).toContain("Copy");
    expect(markup).toContain("<kbd>Ctrl+C</kbd>");
    expect(markup).not.toContain("disabled");
  });
});
