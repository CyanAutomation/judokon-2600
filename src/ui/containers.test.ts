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
    it("renders menu shell with navigation instructions", () => {
      const markup = terminalMenu("<label>Option</label>");
      expect(markup).toContain('class="terminal-menu"');
      expect(markup).toContain('role="radiogroup"');
      expect(markup).toContain("<label>Option</label>");
      expect(markup).toContain("↑ ↓");
      expect(markup).toContain("move");
      expect(markup).toContain("Enter select");
    });

    it("includes help text with keyboard shortcuts", () => {
      const markup = terminalMenu("<div>Menu content</div>");
      expect(markup).toContain('class="menu-help"');
      expect(markup).toContain("aria-hidden");
    });
  });
});
