import { describe, expect, it } from "vitest";
import { definitionList, surface, terminalMenu } from "./containers";

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
      expect(help?.textContent?.replace(/\s+/g, " ").trim()).toContain("Use the arrow keys or tap a choice. Press Enter to choose.");
      expect(help?.querySelector('[aria-hidden="true"]')?.textContent).toBe("↑ ↓");
      expect(help?.querySelector(".menu-help__touch")?.textContent).toContain("Tap a choice");
      expect(help?.querySelector(".menu-help__keyboard")?.textContent).toContain("Press Enter");
    });
  });

  describe("definitionList", () => {
    it("renders reusable labeled values with shared classes and escaped text", () => {
      const root = document.createElement("div");
      root.innerHTML = definitionList([
        { label: "Final score", value: "3–1" },
        { label: "Note", value: "<script>" },
      ], "match-summary-list");
      const list = root.querySelector<HTMLDListElement>("dl.definition-list");

      expect(list?.classList.contains("match-summary-list")).toBe(true);
      expect(list?.querySelectorAll("div")).toHaveLength(2);
      expect(list?.querySelector("dt")?.textContent).toBe("Final score");
      expect(list?.querySelector("dd")?.textContent).toBe("3–1");
      expect(list?.querySelectorAll("dd")[1]?.textContent).toBe("<script>");
      expect(list?.querySelector("script")).toBeNull();
    });
  });
});
