import { MessageProcessor, STRICT_VALIDATION } from "@a2ui/web_core/processing";
import type { ProcessableMessage } from "@a2ui/web_core/processing";
import { DOJO_NOTES_CATALOG_ID, dojoNotesProcessorCatalog } from "./catalog";

export const DOJO_NOTES_SURFACE_ID = "dojo-notes";
export const MAX_A2UI_COMPONENTS = 100;
const MAX_COMPONENT_DEPTH = 8;
const ALLOWED_COMPONENTS = new Set(["Column", "Row", "Card", "Text", "Divider"]);
const ALLOWED_DYNAMIC_PATH = /^\/notes\/[0-3]\/(?:title|message)$/;
type AllowedComponent = "Column" | "Row" | "Card" | "Text" | "Divider";
const COMPONENT_KEYS: Record<AllowedComponent, readonly string[]> = {
  Column: ["id", "component", "children"],
  Row: ["id", "component", "children"],
  Card: ["id", "component", "child"],
  Text: ["id", "component", "text", "variant"],
  Divider: ["id", "component", "axis"],
};

export interface A2uiValidationResult {
  ok: boolean;
  surfaceId?: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasOnlyKeys(value: Record<string, unknown>, keys: readonly string[]): boolean {
  return Object.keys(value).every((key) => keys.includes(key));
}

function hasAllowedDynamicValues(value: unknown): boolean {
  if (Array.isArray(value)) return value.every(hasAllowedDynamicValues);
  if (!isRecord(value)) return true;

  if ("@call" in value || "call" in value || "action" in value) return false;
  if ("@path" in value && "path" in value) return false;
  const path = value["@path"] ?? value.path;
  if (path !== undefined) {
    return typeof path === "string" && ALLOWED_DYNAMIC_PATH.test(path) &&
      hasOnlyKeys(value, ["@path", "path"]);
  }
  return Object.values(value).every(hasAllowedDynamicValues);
}

function hasAllowedComponentShapes(components: unknown): components is Record<string, unknown>[] {
  if (!Array.isArray(components) || components.length === 0 || components.length > MAX_A2UI_COMPONENTS) {
    return false;
  }

  const ids = new Set<string>();
  return components.every((candidate) => {
    if (!isRecord(candidate) || typeof candidate.id !== "string" || candidate.id.length > 64 ||
      !/^[\p{ID_Start}_][\p{ID_Continue}_\u200c\u200d]*$/u.test(candidate.id) || ids.has(candidate.id) ||
      typeof candidate.component !== "string" || !ALLOWED_COMPONENTS.has(candidate.component)) {
      return false;
    }
    const componentType = candidate.component as AllowedComponent;
    const allowedKeys = COMPONENT_KEYS[componentType];
    if (!hasOnlyKeys(candidate, allowedKeys)) return false;
    if (candidate.component === "Text") {
      const text = candidate.text;
      if (!isRecord(text) ||
        (typeof text["@path"] !== "string" && typeof text.path !== "string")) return false;
    }
    ids.add(candidate.id);
    return hasAllowedDynamicValues(candidate);
  });
}

/**
 * Validate one app-owned A2UI v1.0 surface against both the app policy and the
 * official A2UI Core catalog/protocol schemas. No surface data may arrive in
 * the message; the host supplies it separately through the Core data model.
 */
export function validateA2uiMessages(messages: unknown): A2uiValidationResult {
  if (!Array.isArray(messages) || messages.length !== 1) return { ok: false };
  const [message] = messages;
  if (!isRecord(message) || !hasOnlyKeys(message, ["version", "createSurface"]) ||
    message.version !== "1.0" || !isRecord(message.createSurface)) {
    return { ok: false };
  }

  const payload = message.createSurface;
  if (!hasOnlyKeys(payload, ["surfaceId", "catalogId", "components"]) ||
    payload.surfaceId !== DOJO_NOTES_SURFACE_ID || payload.catalogId !== DOJO_NOTES_CATALOG_ID ||
    !hasAllowedComponentShapes(payload.components)) {
    return { ok: false };
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
    processor.processMessages(messages as ProcessableMessage[]);
    const surface = processor.getSurface(DOJO_NOTES_SURFACE_ID);
    if (!surface) return { ok: false };
    surface.componentsModel.validateTopology({
      rootId: "root",
      maxDepth: MAX_COMPONENT_DEPTH,
      allowMissingRoot: false,
      allowDanglingReferences: false,
      allowOrphanComponents: false,
    });
    return { ok: true, surfaceId: DOJO_NOTES_SURFACE_ID };
  } catch {
    return { ok: false };
  } finally {
    processor.dispose();
  }
}

