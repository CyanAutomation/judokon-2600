---
name: tactical-assessment
description: Change or investigate judokon-2600's optional tactical-assessment feature, including its browser client, Vercel route, feature schema, JEV/OpenRouter integration, or deployment. Use for this feature's privacy and failure-handling constraints.
---

# Tactical assessment

This is an optional post-match feature. The deterministic match result is authoritative and must remain available if the assessment is slow, malformed, unconfigured, or unavailable.

## Architecture

- `src/game/tacticalFeatures.ts` derives compact features from the player's recorded stat choices and round outcomes.
- `src/game/tacticalTypes.ts` defines the shared feature and result contracts; `src/game/tacticalJudgment.ts` validates typed scores and applies the confidence policy.
- `src/api/tacticalAssessment.ts` calls the same-origin route with a 5-second client timeout and converts failures into an optional result.
- `api/tactical-assessment.ts` validates and sanitizes the request, calls JEV through `src/jev/openRouterClient.ts`, and maps provider failures to safe response codes.
- `src/ui/game-templates.ts` turns accepted signal booleans into application-authored text. Keep explanatory copy in application code; JEV supplies typed scores only.

Read [the deployment guide](../../../docs/tactical-insight-deployment.md) before changing configuration or deployment behavior.

## Privacy and trust boundary

- Send only the compact tactical features already defined by `TacticalFeatures`. The request must not include judoka IDs, judoka stat values, replay seeds, local storage, or hidden opponent values.
- Preserve the server-side allow-list sanitizer. It rebuilds the accepted feature object and drops unknown properties; do not trust client-supplied fields just because TypeScript has a type for them.
- Keep `OPENROUTER_API_KEY` on the server. Never place it in client code, Vite-exposed variables, committed files, or error responses.
- Validate provider output before applying it. Do not return raw provider errors, credentials, or response bodies to the browser.

## Failure and response behavior

- The route accepts `POST` only and bounds request bodies at 8 KiB. Keep malformed or oversized input from reaching the provider.
- The provider request has a 3.5-second timeout; the browser request has a 5-second timeout. Preserve cancellation and cleanup behavior when changing either boundary.
- A missing key, invalid provider credentials, provider outage, malformed decision, or low-confidence result must leave the match summary intact. Maintain the existing `assessment: null` / optional `issue` contract and avoid turning an optional-service failure into a failed match.
- JEV returns typed score answers, which are validated and filtered by the app's score and confidence thresholds. Do not expose free-form provider prose as game advice.

## Tests and deployment

Use test-first changes at the affected boundary. Extend the nearby tests for feature extraction/sanitization, the route and browser client, orchestration fallback, or rendered post-match text as appropriate. Cover both the new behavior and the invariant that the deterministic summary survives assessment failure. Do not add tests that only assert wording or mirror implementation details.

`npm run dev` serves the game but not the Vercel Function. For a real provider-path check, follow the Preview deployment steps in the deployment guide. Configure `OPENROUTER_API_KEY` only as a server-side Vercel environment variable; `JEV_MODEL` is an optional server-side override.
