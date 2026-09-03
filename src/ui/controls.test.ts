import { describe, expect, it } from "vitest";
import { buttonChoice, radioChoice } from "./controls";

describe("radioChoice", () => {
  it("renders a mutually exclusive choice with a native radio control and shortcut hint", () => {
    const markup = radioChoice({
      id: "mode-champion",
      name: "game-mode",
      label: "Champion",
      description: "Build a streak",
      shortcut: "H",
      checked: true
    });

    expect(markup).toContain('type="radio"');
    expect(markup).toContain('name="game-mode"');
    expect(markup).toContain('id="mode-champion"');
    expect(markup).toContain("checked");
    expect(markup).toContain("Build a streak");
    expect(markup).toContain("<kbd>H</kbd>");
  });
});

describe("buttonChoice", () => {
  it("renders a command button rather than a toggle", () => {
    const markup = buttonChoice("Power", "1", "8", 'data-stat="power"', false, false);

    expect(markup).toContain("<button");
    expect(markup).not.toContain("aria-pressed");
  });
});
