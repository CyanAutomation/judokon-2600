import { MessageProcessor, STRICT_VALIDATION } from "@a2ui/web_core/processing";
import type { ProcessableMessage } from "@a2ui/web_core/processing";
import { DOJO_NOTES_CATALOG_ID, dojoNotesProcessorCatalog } from "../../a2ui/catalog";
import { DOJO_NOTES_SURFACE_ID, MAX_A2UI_COMPONENTS, validateA2uiMessages } from "../../a2ui/protocol";
import type { TacticalNote } from "../tacticalMessages";
import {
  createCardElement,
  createDividerElement,
  createStackElement,
  createTextElement,
  type DividerAxis,
  type StackDirection,
  type TextVariant,
} from "../components/primitives";

const MAX_NOTES = 4;
const MAX_TITLE_LENGTH = 80;
const MAX_MESSAGE_LENGTH = 600;
const MAX_COMPONENT_DEPTH = 8;

export interface DojoNotesDataModel {
  notes: Array<{ title: string; message: string }>;
}

export interface DojoNotesSurface {
  messages: Array<Record<string, unknown>>;
  dataModel: DojoNotesDataModel;
}

function boundedText(value: string, maxLength: number): string {
  return value.slice(0, maxLength);
}

function component(
  id: string,
  type: string,
  properties: Record<string, unknown> = {}
): Record<string, unknown> {
  return { id, component: type, ...properties };
}

/** Build one A2UI surface from locally authored factual note data. */
export function createDojoNotesSurface(notes: readonly TacticalNote[]): DojoNotesSurface | null {
  if (!notes.length) return null;
  if (notes.length > MAX_NOTES) return null;

  const dataModel: DojoNotesDataModel = {
    notes: notes.map(({ title, message }) => ({
      title: boundedText(title, MAX_TITLE_LENGTH),
      message: boundedText(message, MAX_MESSAGE_LENGTH),
    })),
  };

  const components: Record<string, unknown>[] = [];
  const cardIds = dataModel.notes.map((_, index) => `notecard${index}`);
  components.push(component("root", "Column", { children: cardIds }));

  dataModel.notes.forEach((_, index) => {
    const cardId = `notecard${index}`;
    const contentId = `notecontent${index}`;
    const titleId = `notetitle${index}`;
    const messageId = `notemessage${index}`;
    components.push(component(cardId, "Card", { child: contentId }));
    components.push(component(contentId, "Column", { children: [titleId, messageId] }));
    components.push(component(titleId, "Text", {
      text: { "@path": `/notes/${index}/title` },
      variant: "caption",
    }));
    components.push(component(messageId, "Text", {
      text: { "@path": `/notes/${index}/message` },
      variant: "body",
    }));
  });

  if (components.length > MAX_A2UI_COMPONENTS) return null;
  return {
    messages: [{
      version: "1.0",
      createSurface: {
        surfaceId: DOJO_NOTES_SURFACE_ID,
        catalogId: DOJO_NOTES_CATALOG_ID,
        components,
      },
    }],
    dataModel,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function dynamicText(value: unknown, dataModel: { get<T>(path: string): T }): string {
  if (typeof value === "string") return value;
  if (!isRecord(value)) return "";
  const path = value["@path"] ?? value.path;
  if (typeof path !== "string") return "";
  const resolved = dataModel.get<unknown>(path);
  return typeof resolved === "string" ? resolved : "";
}

function childrenFor(value: unknown): string[] {
  return Array.isArray(value) && value.every((child) => typeof child === "string")
    ? value
    : [];
}

function renderComponent(
  id: string,
  surface: NonNullable<ReturnType<MessageProcessor["getSurface"]>>,
  doc: Document,
  depth = 0
): Node {
  if (depth > MAX_COMPONENT_DEPTH) throw new Error("A2UI component nesting exceeds the supported limit");
  const model = surface.componentsModel.get(id);
  if (!model) throw new Error("A2UI component reference is missing");
  const properties = model.properties;

  switch (model.type) {
    case "Column":
    case "Row": {
      const direction: StackDirection = model.type === "Column" ? "column" : "row";
      const children = childrenFor(properties.children).map((childId) =>
        renderComponent(childId, surface, doc, depth + 1)
      );
      return createStackElement(doc, direction, children);
    }
    case "Card": {
      const childId = typeof properties.child === "string" ? properties.child : "";
      const card = createCardElement(doc, [renderComponent(childId, surface, doc, depth + 1)]);
      if (childId.startsWith("notecontent")) {
        const noteIndex = childId.slice("notecontent".length);
        card.setAttribute("aria-labelledby", `dojo-note-title-${noteIndex}`);
      }
      return card;
    }
    case "Text": {
      const variant: TextVariant = properties.variant === "caption" ? "caption" : "body";
      const text = createTextElement(doc, dynamicText(properties.text, surface.dataModel), variant);
      if (variant === "caption" && id.startsWith("notetitle")) {
        text.id = `dojo-note-title-${id.slice("notetitle".length)}`;
      }
      return text;
    }
    case "Divider": {
      const axis: DividerAxis = properties.axis === "vertical" ? "vertical" : "horizontal";
      return createDividerElement(doc, axis);
    }
    default:
      throw new Error("A2UI component type is not supported by the Dojo notes renderer");
  }
}

/**
 * Mount the validated A2UI surface and hide its static fallback only after the
 * complete DOM tree has been built successfully.
 */
export function mountDojoNotesA2ui(
  host: HTMLElement,
  fallback: HTMLElement,
  notes: readonly TacticalNote[]
): boolean {
  host.replaceChildren();
  const surfaceMessage = createDojoNotesSurface(notes);
  if (!surfaceMessage || !validateA2uiMessages(surfaceMessage.messages).ok) {
    host.hidden = true;
    fallback.hidden = false;
    return false;
  }

  const processor = new MessageProcessor([dojoNotesProcessorCatalog], undefined, {
    version: "1.0",
    validationConfig: {
      ...STRICT_VALIDATION,
      targetVersion: "1.0",
      allowedMessages: ["createSurface"],
      maxDepth: MAX_COMPONENT_DEPTH,
      allowUnknownElements: false,
    },
  });

  try {
    processor.processMessages(surfaceMessage.messages as ProcessableMessage[]);
    const surface = processor.getSurface(DOJO_NOTES_SURFACE_ID);
    if (!surface) throw new Error("A2UI surface was not created");
    surface.dataModel.set("/", surfaceMessage.dataModel);
    const fragment = host.ownerDocument.createDocumentFragment();
    fragment.append(renderComponent("root", surface, host.ownerDocument));
    host.replaceChildren(fragment);
    host.hidden = false;
    fallback.hidden = true;
    return true;
  } catch {
    host.replaceChildren();
    host.hidden = true;
    fallback.hidden = false;
    return false;
  } finally {
    processor.dispose();
  }
}

export function mountDojoNotesA2uiIn(root: ParentNode, notes: readonly TacticalNote[]): boolean {
  const host = root.querySelector<HTMLElement>("[data-a2ui-dojo-notes]");
  const fallback = root.querySelector<HTMLElement>(".dojo-notes-fallback");
  return host && fallback ? mountDojoNotesA2ui(host, fallback, notes) : false;
}

