import { describe, expect, it } from "vitest";
import { surface, terminalMenu } from "./containers";

describe("containers", () => {
  describe("surface", () => {
    it("renders a labeled section containing its supplied content", () => {
      const root = document.createElement("div");
      root.innerHTML = surface("section", "fighter-card", "Your judoka", "<p>Player</p>");
      const section = root.querySelector("section[aria-label='Your judoka']");

      expect(section?.tagName).toBe("SECTION");
      expect(section?.textContent).toContain("Player");
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
      expect(help?.textContent?.replace(/\s+/g, " ").trim()).toBe("↑ ↓ move · Enter select");
      expect(help?.querySelector('[aria-hidden="true"]')?.textContent).toBe("↑ ↓");
    });
  });
});
