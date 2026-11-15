---
name: judokon-contributor
description: Implement, review, or debug changes in judokon-2600 gameplay, game state, persistence, browser UI, keyboard controls, or tests. Use for repository-wide behavior and contribution guidance; use focused skills for accessibility, testing strategy, tactical assessment, or GitHub Actions.
---

# Contribute to judokon-2600

Use the repository's existing TypeScript and Vite structure. The app renders its UI directly from TypeScript templates; it does not use React.

## Find the relevant code

- `src/game/`: match rules, summaries, session orchestration, tactical feature extraction.
- `src/state.ts` and `src/game/session.ts`: live state, preferences, and saved-match validation/serialization.
- `src/ui/`: screen templates, DOM controls, keyboard and click handlers.
- `src/api/`: Budokon catalogue client, validation, cache, and tactical-assessment browser client.
- `api/`: Vercel Function routes.
- Tests live beside their modules as `*.test.ts`; UI and orchestration behavior often crosses multiple modules.

For project setup and the full map, read [docs/index.md](../../../docs/index.md). Treat [README.md](../../../README.md) as the current player-facing behavior reference.

## Preserve observable behavior

- Classic mode rotates both judoka; Champion mode keeps the player judoka and rotates opponents. The current Champion streak counts only consecutive trailing wins and resets on a loss or draw.
- Match targets are first-to-3, first-to-5, and first-to-10, with a 25-round cap. Weight division exposes the 14 catalogue classes documented in the README.
- Stat-summary ranking is wins, then win rate, then displayed stat order. Keep this deterministic.
- A replay seed reproduces draws only while the catalogue dataset version and draw algorithm remain the same.
- Persist only stable match state. Do not persist a pending stat choice or optional tactical assessment.
- The interface is keyboard-operable. Keep its documented shortcuts, one-stage-at-a-time setup, native radio groups, and busy-operation guards in sync with the UI.

When a change affects user-visible behavior, update the corresponding test and matching requirement in [docs/test-contracts.md](../../../docs/test-contracts.md). Update the README when its player-facing instructions or behavior descriptions change. Prefer changing an existing requirement ID over inventing a duplicate. Follow the [`judokon-testing` skill](../judokon-testing/SKILL.md) for test selection and quality guidance.

For tactical-assessment changes, also read the [`tactical-assessment` skill](../tactical-assessment/SKILL.md) and [deployment guide](../../../docs/tactical-insight-deployment.md).

For UI accessibility or responsive interaction changes, read the [`judokon-ui-accessibility` skill](../judokon-ui-accessibility/SKILL.md). For test design and requirement traceability, read the [`judokon-testing` skill](../judokon-testing/SKILL.md). For workflow changes, read the [`github-actions-workflows` skill](../github-actions-workflows/SKILL.md).

For Budokon request, validation, cache, or replay-determinism changes, use the API and caching documentation and preserve the constraints below. Consider a dedicated skill only if this integration becomes a frequent independent task area.

- `src/api/drawParameters.ts` normalizes draw parameters before both request construction and cache-key generation. Keep cache identity aligned with every input that changes the upstream draw, including endpoint, seed, count, weight class, and exclusions.
- Preserve strict response validation and actionable HTTP error handling. Failed requests should not become reusable cache entries; callers should not be able to mutate cached judoka or their stats. See [cache behavior](../../../docs/caching.md).
- Replay determinism depends on the catalogue dataset version and draw algorithm. Do not imply the seed alone guarantees identical future results; the README describes this limitation.

## Keyboard behavior

- Setup: `C`/`H` selects mode, `A`/`W` selects division, arrows or `1`–`3` select match length, and `Enter`/`Space` confirms. Weight selection is confirmed before match length.
- Match: `1`–`5` selects a stat; `Enter`/`Space` advances or replays; `Esc`/`Q` quits.
- Keep native control behavior and focus semantics intact when adding custom keyboard handling. Check both the dispatched key event and the rendered state in tests for interaction changes.

## Validation

Use the narrowest relevant checks while developing. When full verification is requested, `npm run check` runs lint, tests, Markdown checks, and the production build. `npm run dev` serves the game but not the Vercel tactical-assessment Function; use the deployment guide for provider-path verification. The README and docs are the maintained source for numeric product behavior and configuration values; avoid duplicating those details here.
