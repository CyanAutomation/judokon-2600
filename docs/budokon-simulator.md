# Local Budokon draw simulator

## Select a transport

`npm run dev` starts Vite in its normal development mode and uses the live Budokon API. Run `npm run dev:sim` to select the local simulator explicitly. Both use the same `BudokonClient`, request builder, response validator, cache, and game orchestration. The simulator does not contact the Budokon Worker and prints a console message when its transport is active.

Only Vite's `serve` command with mode `simulator` selects the simulator. Build commands always alias the transport to the live client, including `npm run build -- --mode simulator`; the simulator module and fixtures are not imported into production bundles. There is no local-storage, cookie, URL, or runtime switch. Return to live draws with `npm run dev`.

## Fixtures and repeatability

The typed fictional catalogue lives in `src/dev/budokon-simulator/fixtures.ts`. It creates six distinct synthetic judoka for each of the 14 supported weight classes, with stable IDs and slugs, country information, and integer stats from 0 to 10. Update the profile definitions there when gameplay tests need different synthetic matchups; the fixture factory expands them across divisions.

For the same request body and fixture version, the simulator returns the same ordered draw. A small rolling hash ranks eligible fixtures using the request seed; it is a Phase 1 convenience algorithm and is not Budokon's `budokon-v1` algorithm. Seed variation can change selection and order. Responses identify their data as `ju-do-kon-sim-fixtures-v1` and their algorithm as `ju-do-kon-simulator-v1`.

The simulator implements only `POST /v1/draw`, the count, seed, weight-class filter, and exclusions needed by the game. It returns HTTP-compatible responses, including a conflict when the eligible pool is too small, and respects request aborts. It does not reproduce Budokon's full filtering, dataset, or seeded selection behavior.

## Tests and related services

Unit tests exercise the simulator through `BudokonClient`. Playwright tests that intercept the live API use `e2e/support/budokon.ts`, which adapts the same simulator responses and fixtures; the browser can still intercept those HTTP requests regardless of app startup mode. `npm run test:e2e:sim` starts the Vite simulator mode and checks Quick Start without intercepting the draw request or contacting the live endpoint.

This simulator covers Budokon draws only. The optional tactical assessment remains a separate same-origin Vercel function and is not provided by simulator mode.
