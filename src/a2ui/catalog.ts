import { Catalog, type ComponentApi, type FunctionImplementation } from "@a2ui/web_core/catalog";

export const DOJO_NOTES_CATALOG_ID =
  "https://github.com/CyanAutomation/judokon-2600/a2ui/catalogs/dojo-notes-v1.json";

const commonType = (name: string) => ({ $ref: `common_types.json#/$defs/${name}` });

function componentSchema(
  name: string,
  properties: Record<string, unknown>,
  required: string[]
): Record<string, unknown> {
  return {
    type: "object",
    properties: { component: { const: name }, ...properties },
    required: ["component", ...required],
    unevaluatedProperties: false,
  };
}

/**
 * Judokon uses the A2UI v1.0 wire format with a deliberately small catalog.
 * This catalog describes the elements our native DOM renderer supports.
 */
export const dojoNotesCatalog = Catalog.fromJson({
  $schema: "https://json-schema.org/draft/2020-12/schema",
  $id: DOJO_NOTES_CATALOG_ID,
  catalogId: DOJO_NOTES_CATALOG_ID,
  protocolVersion: "1.0",
  title: "Judokon Dojo Notes Catalog",
  description: "A limited set of semantic layout and text components for match notes.",
  commonTypesUri: "common_types.json",
  components: {
    Column: componentSchema("Column", { children: commonType("ChildList") }, ["children"]),
    Row: componentSchema("Row", { children: commonType("ChildList") }, ["children"]),
    Card: componentSchema("Card", { child: commonType("Child") }, ["child"]),
    Text: componentSchema(
      "Text",
      {
        text: commonType("DynamicString"),
        variant: { type: "string", enum: ["caption", "body"] },
      },
      ["text"]
    ),
    Divider: componentSchema(
      "Divider",
      { axis: { type: "string", enum: ["horizontal", "vertical"] } },
      []
    ),
  },
}, "1.0", DOJO_NOTES_CATALOG_ID);

/**
 * MessageProcessor currently types its catalogs as executable catalogs even
 * though it only needs schemas here. This schema-only catalog has no functions,
 * so the adaptation is safe for validation and surface state processing.
 */
export const dojoNotesProcessorCatalog =
  dojoNotesCatalog as unknown as Catalog<ComponentApi, FunctionImplementation>;

