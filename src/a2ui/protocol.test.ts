import { describe, expect, it } from "vitest";
import { createDojoNotesSurface } from "../ui/a2ui/dojoNotes";
import { validateA2uiMessages } from "./protocol";

const notes = [{ title: "Adapt after a loss", message: "You switched stats after losing." }];

interface TestMessage {
  version: string;
  createSurface: {
    components: Array<Record<string, unknown>>;
    [key: string]: unknown;
  };
}

function cloneMessage(surface: NonNullable<ReturnType<typeof createDojoNotesSurface>>): TestMessage {
  return structuredClone(surface.messages[0]) as unknown as TestMessage;
}

describe("A2UI protocol boundary", () => {
  it("accepts the app-owned A2UI v1.0 Dojo notes surface", () => {
    const surface = createDojoNotesSurface(notes);

    expect(surface).not.toBeNull();
    expect(validateA2uiMessages(surface!.messages)).toMatchObject({ ok: true, surfaceId: "dojo-notes" });
  });

  it("rejects host data embedded in the A2UI message", () => {
    const surface = createDojoNotesSurface(notes)!;
    const message = cloneMessage(surface);
    message!.createSurface.dataModel = { notes: [{ message: "forged" }] };

    expect(validateA2uiMessages([message]).ok).toBe(false);
  });

  it("rejects unapproved components, function calls, and paths outside the notes model", () => {
    const surface = createDojoNotesSurface(notes)!;
    const message = cloneMessage(surface);
    const components = message.createSurface.components;

    components[0]!.component = "Image";
    expect(validateA2uiMessages([message]).ok).toBe(false);

    const callMessage = cloneMessage(surface);
    const callComponents = callMessage.createSurface.components;
    callComponents.at(-1)!.text = { "@call": "openUrl" };
    expect(validateA2uiMessages([callMessage]).ok).toBe(false);

    const pathMessage = cloneMessage(surface);
    const pathComponents = pathMessage.createSurface.components;
    pathComponents.at(-1)!.text = { "@path": "/secrets/token" };
    expect(validateA2uiMessages([pathMessage]).ok).toBe(false);

    const literalMessage = cloneMessage(surface);
    const literalComponents = literalMessage.createSurface.components;
    literalComponents.at(-1)!.text = "copy embedded in the component message";
    expect(validateA2uiMessages([literalMessage]).ok).toBe(false);

    const catalogOverrideMessage = cloneMessage(surface);
    const overrideComponents = catalogOverrideMessage.createSurface.components;
    overrideComponents[1]!.catalogId = "https://example.com/unapproved-catalog.json";
    expect(validateA2uiMessages([catalogOverrideMessage]).ok).toBe(false);
  });

  it("bounds the component graph and rejects multiple surfaces", () => {
    const surface = createDojoNotesSurface(notes)!;
    const message = cloneMessage(surface);

    expect(validateA2uiMessages([message, message]).ok).toBe(false);

    const oversized = cloneMessage(surface);
    oversized.createSurface.components = Array.from({ length: 101 }, (_, index) => ({
      id: `node-${index}`,
      component: "Text",
      text: "note",
    }));
    expect(validateA2uiMessages([oversized]).ok).toBe(false);
  });
});
