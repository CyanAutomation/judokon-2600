# Test quality review: remediation scorecard

This scorecard follows up on the low-performing cases identified in the test review. It covers the ten listed cases and the five tied status/error cases called out with them; it does not rescore unchanged tests elsewhere in the suite.

Scores are ordered **clarity / behavioral relevance / assertions / isolation / cost vs. coverage**, each from 0 to 2. The original scores are static assessments of the test bodies before remediation. The replacement scores are also static except for the observed suite runtime. No mutation score was collected, so cost/coverage remains provisional at 1 for replacement tests.

## Cases removed or replaced

| Original case | Original score | Disposition and replacement | Replacement score |
| --- | ---: | --- | ---: |
| `main.test.ts`: “generates full context when match is active” | 0/0/0/2/0 = **2** | Removed. Replaced by setup and active-match header assertions in [`render.test.ts`](../src/ui/render.test.ts), linked to `REQ-UI-008`. | 2/2/2/2/1 = **9 — Keep** |
| `main.test.ts`: “sets active weight for weight division with specific class” | 0/0/0/2/0 = **2** | Replaced with a call to `start` and an assertion that the initial catalogue draw receives the selected class, linked to `REQ-GAME-008`. | 2/2/2/2/1 = **9 — Keep** |
| `main.test.ts`: “generates fighter card HTML with player label” | 1/0/0/2/0 = **3** | Removed the fixture-only string concatenation. Real rendered fighter names and resolved stat values are asserted in [`main.test.ts`](../src/main.test.ts), linked to `REQ-UI-011` and `REQ-UI-003`. | 2/2/2/2/1 = **9 — Keep** |
| `main.test.ts`: “produces consistent hash for same seed” | 1/0/0/2/0 = **3** | Removed the duplicate local hash loop. The real seed-to-weight function is tested with fixed seed and boundary cases, linked to `REQ-GAME-009`. | 2/2/2/2/1 = **9 — Keep** |
| `main.test.ts`: “computes hash from seed string correctly” | 1/0/0/2/0 = **3** | Removed the local hash implementation and weak non-collision assertion; covered by the real `selectWeightForSeed` cases linked to `REQ-GAME-009`. | 2/2/2/2/1 = **9 — Keep** |
| `main.test.ts`: “generates setup context when no match exists” | 1/0/0/2/0 = **3** | Removed the local mode-label conditional. Setup header context is checked through `renderApp`, linked to `REQ-UI-008`. | 2/2/2/2/1 = **9 — Keep** |
| `main.test.ts`: “returns configuration prompt when no match exists” | 1/1/0/2/0 = **4** | Replaced the inline status closure with direct tests of the production `status` helper, linked to `REQ-UI-009`. | 2/2/2/2/1 = **9 — Keep** |
| `main.test.ts`: “returns error message when state.errorMessage is set” | 1/1/0/2/0 = **4** | Replaced the inline closure with production status and render assertions. Setup and active-match errors are rendered as text, linked to `REQ-UI-009`. | 2/2/2/2/1 = **9 — Keep** |
| `main.test.ts`: “handles no compatible judoka error with fallback message” | 1/1/0/2/0 = **4** | Replaced manual string construction with a rejected draw through `start`; asserts the actionable message is visible, linked to `REQ-UI-009`. | 2/2/2/2/1 = **9 — Keep** |
| `main.test.ts`: “handles non-Error object throws” | 1/1/0/2/0 = **4** | Replaced manual type branching with a non-Error draw rejection through `start`, linked to `REQ-UI-009`. | 2/2/2/2/1 = **9 — Keep** |

## Tied cases covered by the same replacement

These local status tests had the same original score, **1/1/0/2/0 = 4**, and are now covered by the production-helper status cases in [`status.test.ts`](../src/ui/helpers/status.test.ts):

- Busy draw message.
- Opponent commitment message.
- Stat-selection prompt.
- Match-over win, loss, and draw messages.

The tied generic network-error fallback is covered by the rejected-draw integration cases in [`main.test.ts`](../src/main.test.ts). Each replacement scores **2/2/2/2/1 = 9 — Keep** under the same static assessment.

## Follow-up review of the ten reported low performers

The follow-up scores use the same dimension order. Removed mock-only tests are scored through their retained integration coverage.

| Reported case | Change and current coverage | Current score |
| --- | --- | ---: |
| main.test.ts: “handles division switching mid-session” | Removed the fixture-only assignments. The real Weight selection handler now checks the division, next setup step, persistence, and render behavior in src/ui/changeHandlers.test.ts, linked to REQ-UI-014. | 2/2/2/2/1 = **9 — Keep** |
| containers.test.ts: “includes help text with keyboard shortcuts” | Merged into one DOM-based menu contract test that checks the group, actual instructions, and decorative arrow, linked to REQ-KEYBOARD-008. | 2/2/2/2/1 = **9 — Keep** |
| clickHandlers.test.ts: Start callback dispatch | Removed the mock-only case. The click-driven start and first-round flow remains covered in src/main.test.ts, linked to REQ-GAME-013. | 2/2/2/2/1 = **9 — Keep** |
| clickHandlers.test.ts: Quit callback dispatch | Replaced the mock-only case with a real Quit-button click that verifies run cleanup and setup return in src/main.test.ts, linked to REQ-GAME-007. | 2/2/2/2/1 = **9 — Keep** |
| setup-templates.test.ts: final CTA and rules | The DOM-based assertion checks the scoring rule, selected target, and Start action together in the setup panel, linked to REQ-UI-015. | 2/2/2/2/1 = **9 — Keep** |
| setup-templates.test.ts: staged terminal menu | Replaced the unverified “vertical” layout claim with checks for one active native radio group, and linked stage and summary behavior to REQ-UI-014. | 2/2/2/2/1 = **9 — Keep** |
| constants.test.ts: weight classes | Replaced partial examples with the full documented ordered list, linked to REQ-GAME-012. | 2/2/2/2/1 = **9 — Keep** |
| inputs.test.ts: active and disabled radio choices | DOM assertions now inspect the native disabled property and the active cursor indicator. It remains unlinked to a product-specific contract. | 2/1/2/2/1 = **8 — Keep** |
| state.test.ts: initial defaults | Replaced the full internal state snapshot with user-facing setup defaults and linked them to REQ-UI-013. | 2/2/2/2/1 = **9 — Keep** |
| cache.test.ts: invalid entry limit | Documented the positive safe-integer option and expanded coverage to zero, negative, fractional, non-finite, and unsafe values, plus a valid limit. | 2/1/2/2/1 = **8 — Keep** |

## Verification and limits

- `npm test` passed twice after remediation: 23 files and 280 cases each run. Total runtime was 15–18 seconds, including jsdom startup.
- `npm run lint` passed.
- `npm run build` passed.
- Follow-up `npm run check` passed: lint, 24 test files and 281 cases, and production build.
- Mutation coverage was not measured. The repository has Vitest coverage instrumentation, but that does not measure mutation score. The cost/coverage score is therefore provisional.

## Follow-up: current low-scoring cases

The October 2026 follow-up revised the next ten lowest-scoring cases from the current suite:

- Removed the standalone `surface("aside", ...)` test because the rendered opponent intel landmark is checked in `main.test.ts`.
- Removed the synthetic disabled-button click test; it exercised a programmatically dispatched event rather than a normal user click.
- Replaced exact oscillator frequency, volume, envelope, and delay assertions with enabled/muted keyboard feedback and outcome feedback checks linked to `REQ-AUDIO-016`.
- Reworked mode and division click-order cases to dispatch click and change events and assert the resulting setup stage under `REQ-UI-014`.
- Replaced the replay callback mock check with a rendered Replay-button flow that starts a fresh match using the active seed, linked to `REQ-GAME-017`.
- Changed the section helper check to parse and assert the semantic section and its accessible label. The quiet-button test now checks its visible label and shortcut without asserting the absence of an unsupported disabled option.

The revised cost scores remain provisional because mutation scores were not collected.

## Additional low-value test cleanup

The next pass removed duplicate helper-level checks and replaced markup-string checks with DOM contract assertions:

- `main.test.ts`: removed the direct clipboard helper success test because the click-driven success and failure cases cover the user-visible action. The provided-seed test now asserts the active seed and requested draw input, without depending on `crypto.randomUUID` not being called.
- `keyboardGuards.test.ts`: removed the direct positive seed-modal Escape helper case; keyboard dispatcher coverage exercises that behavior through the event flow. The distinct false cases remain.
- `clickHandlers.test.ts`: removed a synthetic dispatched click against a disabled button, which does not model normal browser interaction with disabled controls.
- `inputs.test.ts`: replaced string checks and a custom HTML attribute parser with DOM assertions for radio semantics, accessible full and compact labels, independent selected/strongest states, and toggle `aria-pressed` behavior.
- `buttons.test.ts`: folded decorative shortcut accessibility into the primary button contract test, checking the native disabled property and shortcut wrapper. Removed the quiet-button assertion that it is enabled by default, since enabled state is not part of that helper's contract.
- `kasekiWorkflow.test.ts`: parses non-comment CODEOWNERS entries and checks the exact path-to-owner mappings rather than matching raw substrings.

The focused validation after these changes passed: 7 test files and 82 tests, including the keyboard dispatcher integration test. After restoring dependencies with `npm ci`, `npm run check` passed: lint, 27 test files and 312 tests, Markdown link and style checks, and the production build. Mutation scores remain unmeasured, so cost scores remain provisional.

## Follow-up cleanup after the October 2026 scorecard

- Removed the setup-panel shared-class check, the render-only sticky-class check, the raw setup utility markup check, and the stylesheet regex test. The remaining setup and render assertions focus on page semantics, available actions, and the accessible settings group.
- Removed the unknown-stat callout test because it constructed a `MatchResult` that violates the type and saved-session validation contract. The defensive production fallback remains in place.
- Replaced the setup copy assertions with a page-heading and status-region contract. The result-copy test now compares the result panel with the status helper, so it verifies both surfaces.
- Reworked the action-group test to assert its labeled group and contained action, and changed the round-history check to inspect the parsed list's accessible label and keyboard focusability.
- Reworked the rendered settings test to assert the labeled settings group, seed and sound controls, and the modal dialog's accessible name and location.

Validation after this cleanup: `npm run check` passed, including lint, 27 test files and 324 tests, Markdown link/style checks, and the production build. Mutation scores remain unmeasured, so cost/coverage scores remain provisional.
