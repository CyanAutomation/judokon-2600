import { describe, expect, it } from "vitest";
import { surface, terminalMenu } from "./containers";

describe("containers", () => {
  describe("surface", () => {
    it.each(["section", "aside"] as const)("renders the requested %s landmark with its label and content", (tag) => {
      const root = document.createElement("div");
      root.innerHTML = surface(tag, "fighter-card", "Your judoka", "<p>Player</p>");
      const landmark = root.querySelector(`${tag}[aria-label='Your judoka']`);

      expect(landmark?.tagName).toBe(tag.toUpperCase());
      expect(landmark?.textContent).toContain("Player");
    });

    it("escapes class names and labels for security", () => {
      const markup = surface("section", 'bad" class="', 'label"><script>', "content");
      expect(markup).toContain('&quot;');
      expect(markup).toContain("&lt;script&gt;");
    });
  });

  describe("terminalMenu", () => {
    it("[REQ-KEYBOARD-008] groups choices for assistive technology and describes menu navigation", () => {
      const root = document.createElement("div");
      root.innerHTML = terminalMenu('<label for="option">Option</label>');

      const group = root.querySelector('[role="radiogroup"]');
      const help = root.querySelector(".menu-help");

      expect(group?.textContent).toContain("Option");
      expect(help?.textContent?.replace(/\s+/g, " ").trim()).toContain("Use the arrow keys to move. Press Enter to choose.");
      expect(help?.querySelector('[aria-hidden="true"]')?.textContent).toBe("↑ ↓");
    });
  });
});
