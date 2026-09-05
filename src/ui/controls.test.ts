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
  const parseButton = (markup: string) => {
    const match = markup.match(/^<button\b([^>]*)>([\s\S]*)<\/button>$/);
    expect(match).not.toBeNull();
    const attributes = new Map(Array.from(match![1].matchAll(/([\w-]+)(?:="([^"]*)")?/g), ([, name, value]) => [name, value ?? ""]));
    return {
      // HTML boolean attributes reflect as true on the native property regardless of their value.
      disabled: attributes.has("disabled"),
      getAttribute: (name: string) => attributes.get(name) ?? null,
      content: match![2]
    };
  };

  it("exposes selected and strongest as independent states", () => {
    const selected = parseButton(buttonChoice("Power", "1", "8", 'data-stat="power"', false, true, false));

    expect(selected.disabled).toBe(false);
    expect(selected.getAttribute("aria-current")).toBe("true");
    expect(selected.content).not.toContain("<em>Strongest</em>");

    const strongest = parseButton(buttonChoice("Technique", "3", "10", 'data-stat="technique"', true, false, true));

    expect(strongest.disabled).toBe(true);
    expect(strongest.getAttribute("aria-current")).toBeNull();
    expect(strongest.content).toContain("<em>Strongest</em>");
    expect(strongest.content).not.toContain('aria-hidden="true">Strongest');
    expect(strongest.getAttribute("aria-pressed")).toBeNull();
  });
});

describe("shared UI primitives", () => {
  it("renders a labelled surface with caller-provided variants", () => {
    const markup = surface("aside", "panel scout-report", "Scout report", "<p>Read the opponent.</p>");

    expect(markup).toMatch(/^<aside\b/);
    expect(markup).toMatch(/<\/aside>$/);
    expect(markup).toContain('class="surface panel scout-report"');
    expect(markup).toContain('aria-label="Scout report"');
    expect(markup).toContain("<p>Read the opponent.</p>");

    const hostileMarkup = surface(
      "aside",
      'panel scout-report" data-injected="true',
      'Scout <report> & "analysis"',
      "<p>Retained child content.</p>"
    );

    expect(hostileMarkup).toContain('class="surface panel scout-report&quot; data-injected=&quot;true"');
    expect(hostileMarkup).not.toContain('data-injected="true"');
    expect(hostileMarkup).toContain('aria-label="Scout &lt;report&gt; &amp; &quot;analysis&quot;"');
    expect(hostileMarkup).toContain("<p>Retained child content.</p>");
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
