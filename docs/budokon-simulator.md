# Local Budokon draw simulator

## Select a transport

`npm run dev` starts Vite in its normal development mode and uses the live Budokon API. Run `npm run dev:sim` to select the local simulator explicitly. Both use the same `BudokonClient`, request builder, response validator, cache, and game orchestration. The simulator does not contact the Budokon Worker and prints a console message when its transport is active.

Only Vite's `serve` command with mode `simulator` selects the simulator, and only mode `chaos` selects fault injection. Build commands always alias the transport to the live client, including `npm run build -- --mode simulator` and `npm run build -- --mode chaos`; development-only transports and fixtures stay out of production bundles. There is no local-storage, cookie, URL, or runtime switch. Return to live draws with `npm run dev`.

Run `npm run dev:chaos` to use the same local fixtures with a one-shot `503-once` fault: the first draw fails and the next attempt succeeds. Choose another local-only profile with `VITE_BUDOKON_FAULT_PROFILE`:

| Profile | First draw |
| --- | --- |
| `503-once` | Returns HTTP 503, then later draws use the simulator normally. |
| `delay` | Waits 1.5 seconds, then returns a valid simulator response. |
| `timeout` | Waits 12 seconds; the client times out at 10 seconds. |
| `network` | Rejects like a failed network connection. |
| `malformed-json` | Returns HTTP 200 with invalid JSON. |
| `invalid-shape` | Returns HTTP 200 with a response that fails schema validation. |

For example, `VITE_BUDOKON_FAULT_PROFILE=malformed-json npm run dev:chaos`. The profile is read only by the chaos development transport. Unknown profile names fail during app startup with the supported choices.

## Fixtures and repeatability

The typed fictional catalogue lives in `src/dev/budokon-simulator/fixtures.ts`. It creates six distinct synthetic judoka for each of the 14 supported weight classes, with stable IDs and slugs, country information, and integer stats from 0 to 10. Update the profile definitions there when gameplay tests need different synthetic matchups; the fixture factory expands them across divisions.

For the same request body and fixture version, the simulator returns the same ordered draw. A small rolling hash ranks eligible fixtures using the request seed; it is a Phase 1 convenience algorithm and is not Budokon's `budokon-v1` algorithm. Seed variation can change selection and order. Responses identify their data as `ju-do-kon-sim-fixtures-v1` and their algorithm as `ju-do-kon-simulator-v1`.

The simulator implements only `POST /v1/draw`, the count, seed, weight-class filter, and exclusions needed by the game. It returns HTTP-compatible responses, including a conflict when the eligible pool is too small, and respects request aborts. It does not reproduce Budokon's full filtering, dataset, or seeded selection behavior.

## Tests and related services

Unit tests exercise the simulator through `BudokonClient`. The reusable `createFaultInjectingFetch` wrapper supports per-request delays, network errors, raw HTTP responses, and pass-through entries in a deterministic sequence. Playwright tests that intercept the live API use `e2e/support/budokon.ts`; pass a `scenarios` sequence to simulate an outage and recovery without calling the live endpoint. `npm run test:e2e:sim` starts the happy-path Vite simulator mode; `npm run test:e2e:chaos` checks the local 503-then-recovery profile and verifies that it makes no live Budokon requests.

The default client timeout is 10 seconds. A delay fault respects the client abort signal, so longer delays exercise timeout handling and shorter delays exercise the loading path. Failed draws are not cached and can be retried by the player. The app does not automatically retry POST requests; any future automatic retry policy should first confirm the Budokon endpoint's repeated-request semantics.

In browser developer tools, `window.judokonApiDiagnostics()` returns in-memory aggregate attempt counts, outcome categories, failed HTTP status counts, and elapsed time. It does not retain or send request seeds, judoka, or response bodies. Existing cache counters remain available from `window.judokonCacheStats()`.

This simulator covers Budokon draws only. The optional tactical assessment remains a separate same-origin Vercel function and is not provided by simulator mode.
