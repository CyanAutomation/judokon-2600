import { describe, expect, it } from "vitest";
import { buttonChoice, radioChoice, utilityButton } from "./inputs";

describe("inputs", () => {
  describe("radioChoice", () => {
    it("renders a mutually exclusive choice with a native radio control and shortcut hint", () => {
      const markup = radioChoice({
        id: "mode-champion",
        name: "game-mode",
        label: "Champion",
        description: "Build a streak",
        shortcut: "H",
        checked: true,
      });

      expect(markup).toContain('type="radio"');
      expect(markup).toContain('name="game-mode"');
      expect(markup).toContain('id="mode-champion"');
      expect(markup).toContain("checked");
      expect(markup).toContain("Build a streak");
      expect(markup).toContain("<kbd>H</kbd>");
    });

    it("supports compact labels for responsive display", () => {
      const markup = radioChoice({
        id: "test",
        name: "test",
        label: "Full Label",
        compactLabel: "Short",
        description: "Description",
        shortcut: "T",
        checked: false,
      });

      expect(markup).toContain("choice-label-full");
      expect(markup).toContain("Full Label");
      expect(markup).toContain("choice-label-compact");
      expect(markup).toContain("Short");
    });

    it("supports active and disabled states", () => {
      const active = radioChoice({
        id: "test-active",
        name: "test",
        label: "Active",
        description: "Is active",
        shortcut: "A",
        checked: false,
        active: true,
      });
      expect(active).toContain("is-active");
      expect(active).toContain("menu-caret");
      expect(active).toContain(">");

      const disabled = radioChoice({
        id: "test-disabled",
        name: "test",
        label: "Disabled",
        description: "Is disabled",
        shortcut: "D",
        checked: false,
        disabled: true,
      });
      expect(disabled).toContain("disabled");
    });
  });

  describe("buttonChoice", () => {
    const parseButton = (markup: string) => {
      const match = markup.match(/^<button\b([^>]*)>([\s\S]*)<\/button>$/);
      expect(match).not.toBeNull();
      const attributes = new Map(
        Array.from(match![1].matchAll(/([\w-]+)(?:="([^"]*)")?/g), ([, name, value]) => [
          name,
          value ?? "",
        ])
      );
      return {
        // HTML boolean attributes reflect as true on the native property regardless of their value.
        disabled: attributes.has("disabled"),
        getAttribute: (name: string) => attributes.get(name) ?? null,
        content: match![2],
      };
    };

    it("exposes selected and strongest as independent states", () => {
      const selected = parseButton(buttonChoice({ label: "Power", shortcut: "1", value: "8", data: 'data-stat="power"', disabled: false, selected: true, strongest: false }));

      expect(selected.disabled).toBe(false);
      expect(selected.getAttribute("aria-current")).toBe("true");
      expect(selected.content).not.toContain("<em>Strongest</em>");

      const strongest = parseButton(
        buttonChoice({ label: "Technique", shortcut: "3", value: "10", data: 'data-stat="technique"', disabled: true, selected: false, strongest: true })
      );

      expect(strongest.disabled).toBe(true);
      expect(strongest.getAttribute("aria-current")).toBeNull();
      expect(strongest.content).toContain("<em>Strongest</em>");
      expect(strongest.content).not.toContain('aria-hidden="true">Strongest');
      expect(strongest.getAttribute("aria-pressed")).toBeNull();
    });

    it("uses the shared control primitive for stat choice buttons", () => {
      expect(buttonChoice({ label: "Power", shortcut: "1", value: "8", data: 'data-stat="power"', disabled: false })).toContain(
        'class="control control--choice action-button option-card'
      );
    });
  });

  describe("utilityButton", () => {
    it("renders with aria-pressed state when provided", () => {
      const on = utilityButton("sound", "Sound: On", true);
      expect(on).toContain('aria-pressed="true"');

      const off = utilityButton("sound", "Sound: Off", false);
      expect(off).toContain('aria-pressed="false"');
    });

    it("renders without aria-pressed when state is undefined", () => {
      const markup = utilityButton("sound", "Sound");
      expect(markup).not.toContain("aria-pressed");
    });

    it("uses the control utility class", () => {
      expect(utilityButton("test", "Test")).toContain('class="control control--utility utility-button"');
    });
  });
});
