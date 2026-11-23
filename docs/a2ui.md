# A2UI notes renderer

Dojo notes use the official `@a2ui/web_core` implementation of the A2UI v1.0
message and component validation protocol. Judokon supplies a small catalog
containing only `Column`, `Row`, `Card`, `Text`, and `Divider`; the renderer
maps those components to native HTML and reusable primitives in
`src/ui/components/primitives.ts`.

The client builds the component tree from app-authored note titles and factual
messages. The A2UI messages contain component IDs and data bindings, while note
copy is passed separately to the local A2UI data model. The surface accepts no
literal text in the component message, provider-generated layout, functions,
actions, URLs, or additional game/profile data. Text is inserted through
`textContent`.

The renderer mounts inside the existing Dojo notes region. If validation or DOM
construction fails, the static escaped note copy remains visible. The
deterministic match summary, existing notification action, and heading focus
behavior remain available independently of the A2UI renderer. This uses no new
network request or environment variable.
