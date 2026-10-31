import { describe, expect, it } from "vitest";
import { buttonChoice, radioChoice, utilityButton } from "./inputs";

describe("inputs", () => {
  describe("radioChoice", () => {
    it("offers a checked radio choice with its description and accessible shortcut", () => {
      const root = document.createElement("div");
      root.innerHTML = radioChoice({
        id: "mode-champion",
        name: "game-mode",
        label: "Champion",
        description: "Build a streak",
        shortcut: "H",
        checked: true,
      });
      const input = root.querySelector<HTMLInputElement>("#mode-champion");

      expect(input?.type).toBe("radio");
      expect(input?.name).toBe("game-mode");
      expect(input?.checked).toBe(true);
      const label = root.querySelector<HTMLLabelElement>('label[for="mode-champion"]');
      expect(label?.textContent).toContain("Champion");
      expect(label?.textContent).toContain("Build a streak");
      expect(root.querySelector("kbd")?.textContent).toBe("H");
      expect(root.querySelector(".visually-hidden")?.textContent).toContain("Shortcut: H");
      expect(label?.htmlFor).toBe(input?.id);
    });

    it("keeps the full label available to assistive technology beside its compact display label", () => {
      const root = document.createElement("div");
      root.innerHTML = radioChoice({
        id: "test",
        name: "test",
        label: "Full Label",
        compactLabel: "Short",
        description: "Description",
        shortcut: "T",
        checked: false,
      });

      const fullLabel = root.querySelector(".choice-label-full");
      const compactLabel = root.querySelector(".choice-label-compact");
      expect(fullLabel?.textContent).toBe("Full Label");
      expect(fullLabel?.getAttribute("aria-hidden")).toBeNull();
      expect(compactLabel?.textContent).toBe("Short");
      expect(compactLabel?.getAttribute("aria-hidden")).toBe("true");
    });

    it("shows the active cursor and disables an unavailable native choice", () => {
      const root = document.createElement("div");
      root.innerHTML = radioChoice({
        id: "test-active",
        name: "test",
        label: "Active",
        description: "Is active",
        shortcut: "A",
        checked: false,
        active: true,
      }) + radioChoice({
        id: "test-disabled",
        name: "test",
        label: "Unavailable",
        description: "Not available during a draw",
        shortcut: "D",
        checked: false,
        disabled: true,
      });

      const activeInput = root.querySelector<HTMLInputElement>("#test-active");
      const activeCard = root.querySelector<HTMLLabelElement>('label[for="test-active"]');
      const disabledInput = root.querySelector<HTMLInputElement>("#test-disabled");

      expect(activeInput?.disabled).toBe(false);
      expect(activeCard?.classList.contains("is-active")).toBe(true);
      expect(activeCard?.querySelector(".menu-caret")?.textContent).toBe(">");
      expect(disabledInput?.disabled).toBe(true);
    });
  });

  describe("buttonChoice", () => {
    it("exposes selected and strongest as independent states", () => {
      const root = document.createElement("div");
      root.innerHTML = buttonChoice({ label: "Power", shortcut: "1", value: "8", data: 'data-stat="power"', disabled: false, selected: true, strongest: false })
        + buttonChoice({ label: "Technique", shortcut: "3", value: "10", data: 'data-stat="technique"', disabled: true, selected: false, strongest: true });
      const selected = root.querySelector<HTMLButtonElement>('[data-stat="power"]');
      const strongest = root.querySelector<HTMLButtonElement>('[data-stat="technique"]');

      expect(selected?.disabled).toBe(false);
      expect(selected?.classList.contains("control")).toBe(true);
      expect(selected?.classList.contains("control--choice")).toBe(true);
      expect(selected?.getAttribute("aria-pressed")).toBe("true");
      expect(selected?.hasAttribute("aria-current")).toBe(false);
      expect(selected?.textContent).not.toContain("Strongest");
      expect(strongest?.disabled).toBe(true);
      expect(strongest?.getAttribute("aria-pressed")).toBe("false");
      expect(strongest?.querySelector("em")?.textContent).toBe("Top stat");
      expect(strongest?.querySelector("em")?.getAttribute("aria-hidden")).toBeNull();
      expect(selected?.querySelector(".visually-hidden")?.textContent).toContain("Shortcut: 1");
      expect(strongest?.querySelector(".visually-hidden")?.textContent).toContain("Shortcut: 3");
    });

  });

  describe("utilityButton", () => {
    it("exposes toggle state to assistive technology only for toggle buttons", () => {
      const root = document.createElement("div");
      root.innerHTML = utilityButton("sound-on", "Sound: On", true)
        + utilityButton("sound-off", "Sound: Off", false)
        + utilityButton("copy", "Copy");

      expect(root.querySelector<HTMLButtonElement>("#sound-on")?.getAttribute("aria-pressed")).toBe("true");
      expect(root.querySelector<HTMLButtonElement>("#sound-off")?.getAttribute("aria-pressed")).toBe("false");
      expect(root.querySelector<HTMLButtonElement>("#copy")?.hasAttribute("aria-pressed")).toBe(false);
    });

  });
});
