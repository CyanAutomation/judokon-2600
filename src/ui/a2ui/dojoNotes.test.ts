import { describe, expect, it } from "vitest";
import { createDojoNotesSurface, mountDojoNotesA2ui } from "./dojoNotes";

describe("Dojo notes A2UI surface", () => {
  it("returns no surface when there are no validated notes", () => {
    expect(createDojoNotesSurface([])).toBeNull();
  });

  it("builds a data-bound A2UI card for each note and keeps host data separate", () => {
    const surface = createDojoNotesSurface([
      { title: "Adapt after a loss", message: "You changed stats after losing." },
      { title: "Try another stat", message: "Technique won more picks." },
    ]);

    expect(surface?.messages).toHaveLength(1);
    expect(surface?.messages[0]).toMatchObject({
      version: "1.0",
      createSurface: {
        surfaceId: "dojo-notes",
        catalogId: expect.stringContaining("github.com/CyanAutomation/judokon-2600/a2ui/catalogs"),
      },
    });
    expect(surface?.messages[0].createSurface).not.toHaveProperty("dataModel");
    expect(surface?.dataModel).toEqual({
      notes: [
        { title: "Adapt after a loss", message: "You changed stats after losing." },
        { title: "Try another stat", message: "Technique won more picks." },
      ],
    });
  });

  it("mounts reusable cards and keeps note copy as text", () => {
    const host = document.createElement("div");
    const fallback = document.createElement("div");
    fallback.hidden = true;
    const notes = [{ title: "Pattern", message: "<img src=x onerror=alert(1)>" }];

    const rendered = mountDojoNotesA2ui(host, fallback, notes);

    expect(rendered).toBe(true);
    expect(host.hidden).toBe(false);
    expect(fallback.hidden).toBe(true);
    expect(host.querySelectorAll("article.ui-card")).toHaveLength(1);
    expect(host.querySelector(".ui-text--caption")?.textContent).toBe("Pattern");
    expect(host.textContent).toContain("<img src=x onerror=alert(1)>");
    expect(host.querySelector("img")).toBeNull();
  });

  it("keeps fallback copy visible when a surface exceeds its note bound", () => {
    const host = document.createElement("div");
    const fallback = document.createElement("div");
    fallback.hidden = true;
    const notes = Array.from({ length: 5 }, (_, index) => ({
      title: `Note ${index + 1}`,
      message: "A factual note.",
    }));

    expect(mountDojoNotesA2ui(host, fallback, notes)).toBe(false);
    expect(host.hidden).toBe(true);
    expect(fallback.hidden).toBe(false);
  });
});
