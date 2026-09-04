import { describe, expect, it } from "vitest";
import { buttonChoice, disclosure, radioChoice, surface, toggleControl } from "./controls";

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

  it("keeps strongest and selected states distinct for the visual state system", () => {
    const markup = buttonChoice("Technique", "3", "10", 'data-stat="technique"', true, true, true);

    expect(markup).toContain("is-selected");
    expect(markup).toContain("is-strongest");
    expect(markup).toContain("disabled");
  });
});

describe("shared UI primitives", () => {
  it("renders a labelled surface with caller-provided variants", () => {
    const markup = surface("aside", "panel scout-report", "Scout report", "<p>Read the opponent.</p>");

    expect(markup).toBe('<aside class="surface panel scout-report" aria-label="Scout report"><p>Read the opponent.</p></aside>');
  });

  it("renders the advanced control as an accessible disclosure", () => {
    const markup = disclosure("Advanced options", "<p>Settings</p>");

    expect(markup).toContain('<details class="advanced">');
    expect(markup).toContain('aria-label="Show advanced options"');
    expect(markup).toContain('class="disclosure-state" aria-hidden="true">Show</span>');
  });

  it("renders a full-row labelled toggle", () => {
    const markup = toggleControl("sound-enabled", "Sound", false, "Keyboard ticks and outcome beeps");

    expect(markup).toContain('for="sound-enabled"');
    expect(markup).toContain('role="switch"');
    expect(markup).toContain("Keyboard ticks and outcome beeps");
    expect(markup).toContain(">Off<");
  });
});
