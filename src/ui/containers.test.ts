import { describe, expect, it } from "vitest";
import { surface, terminalMenu } from "./containers";

describe("containers", () => {
  describe("surface", () => {
    it("renders a section element with proper attributes", () => {
      const markup = surface("section", "scout-report", "Scout report", "<p>Content</p>");
      expect(markup).toContain('<section class="surface panel scout-report"');
      expect(markup).toContain('aria-label="Scout report"');
      expect(markup).toContain("<p>Content</p>");
      expect(markup).toContain("</section>");
    });

    it("renders an aside element when specified", () => {
      const markup = surface("aside", "sidebar", "Sidebar content", "<p>Aside</p>");
      expect(markup).toContain("<aside");
      expect(markup).toContain("</aside>");
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
