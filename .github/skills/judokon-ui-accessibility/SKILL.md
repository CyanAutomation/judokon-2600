---
name: judokon-ui-accessibility
description: Change or review judokon-2600 browser UI accessibility, keyboard and focus behavior, responsive layout, reduced motion, or notifications. Use alongside judokon-contributor for UI changes.
---

# UI accessibility and interaction

The app renders TypeScript templates into the DOM; it does not use a component framework. Preserve native browser behavior and keep interaction accessible when changing templates, handlers, or styles.

## Inspect before changing

- Read [`judokon-contributor`](../judokon-contributor/SKILL.md) for game behavior and the relevant templates, event handlers, and CSS in `src/ui/` and `src/style.css`.
- Read [test behavior contracts](../../../docs/test-contracts.md) for existing UI requirements. For notification behavior, read the [snackbar plan](../../../docs/snackbar-plan.md).
- Treat the rendered DOM and browser interaction as the contract. Avoid tests that assert template strings or CSS implementation details when a user-visible DOM behavior can be asserted.

## Preserve access and interaction

- Prefer semantic HTML and native controls. Keep radio choices in a labeled native radio group and retain clear accessible names for buttons, dialogs, regions, and disclosures.
- Keep all actions operable by keyboard, preserve expected focus behavior, and do not intercept keys while users are typing in editable controls or interacting with dialogs.
- Keep focus stable when rerendering or resizing. A transient notification must not remove or replace gameplay DOM, steal focus, or cover an actionable control.
- Preserve screen-reader announcement politeness, reduced-motion behavior, and notification pause/dismissal behavior. Essential scores, round outcomes, scouting details, and actionable errors must remain available outside transient notifications.
- Keep mobile action and notification areas in the layout flow with reserved space; do not solve overlap by placing essential content over controls.

## Change and verify

For observable behavior changes, follow [`judokon-testing`](../judokon-testing/SKILL.md): update the closest contract, test the user interaction and rendered state, and update README guidance when player behavior changes. Prefer a focused test for the affected interaction; use the browser smoke test for end-to-end flows when the change crosses major screens. Run `npm run check` when full validation is requested.
