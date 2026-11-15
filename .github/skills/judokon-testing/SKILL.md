---
name: judokon-testing
description: Design, update, or review tests in judokon-2600, including mapping user-visible behavior to stable requirement IDs and choosing unit, DOM, integration, or browser coverage.
---

# Testing judokon-2600

Tests live beside their implementation as `*.test.ts`; the browser smoke test is in `e2e/`. Use [test behavior contracts](../../../docs/test-contracts.md) to keep user-visible requirements traceable to tests.

## Test observable behavior

- Before changing a user-visible behavior, find an existing `REQ-*` requirement and the test that covers it. Update that requirement rather than creating a duplicate. Add a requirement only for a distinct behavior.
- Start with the narrowest test at the affected boundary: pure game or validation logic, rendered DOM, click/keyboard flow, orchestration, API route/client, or browser smoke test.
- Prefer assertions against production behavior: rendered accessible DOM, actual event dispatch and resulting state, real request construction, or an integration flow. Avoid tests that only restate a mock callback, copy implementation logic into the test, or assert incidental markup/CSS.
- For async paths, cover meaningful success and failure behavior, including the user-visible fallback and cleanup where applicable. Keep the deterministic game result authoritative when optional services fail.
- Keep tests isolated and deterministic. Use controlled fixtures, fake timers, or network mocks at the boundary; do not depend on live catalogue or provider services in the normal test suite.

## Keep the contract current

- Update `docs/test-contracts.md` alongside tests when visible behavior changes, and update the README when player instructions or behavior descriptions change.
- For keyboard, focus, semantics, responsive layout, motion, or notifications, also follow [`judokon-ui-accessibility`](../judokon-ui-accessibility/SKILL.md) and any matching requirements in [the snackbar plan](../../../docs/snackbar-plan.md).
- Existing tests are not automatically valuable: remove or replace assertions that test only internal wiring when stronger user-level coverage already exists. See [test quality review](../../../docs/test-quality-review.md) for the repository's documented examples.

## Validation commands

- Run a focused test file with `npm exec -- vitest run path/to/file.test.ts` while iterating.
- Run `npm run test:e2e` for the Playwright smoke flow; install Chromium first if the local environment lacks it.
- Run `npm run check` for the full local gate: lint, unit/integration tests, docs checks, and production build.

Do not claim a broader validation level than the commands actually run. Plain `npm run dev` does not provide the Vercel function route.
