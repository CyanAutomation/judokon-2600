# Test quality review: remediation scorecard

This scorecard follows up on the low-performing cases identified in the test review. It covers the ten listed cases and the five tied status/error cases called out with them; it does not rescore unchanged tests elsewhere in the suite.

Scores are ordered **clarity / behavioral relevance / assertions / isolation / cost vs. coverage**, each from 0 to 2. The original scores are static assessments of the test bodies before remediation. The replacement scores are also static except for the observed suite runtime. No mutation-testing tool is installed, so cost/coverage remains provisional at 1 for replacement tests.

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

## Verification and limits

- `npm test` passed twice after remediation: 23 files and 280 cases each run. Total runtime was 15–18 seconds, including jsdom startup.
- `npm run lint` passed.
- `npm run build` passed.
- Mutation coverage was not measured: neither Stryker nor a Vitest coverage provider is installed. The cost/coverage score is therefore provisional, not a measured mutation score.
