# judokon-2600

[![CI](https://github.com/CyanAutomation/judokon-2600/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/CyanAutomation/judokon-2600/actions/workflows/ci.yml) [![CodeQL](https://github.com/CyanAutomation/judokon-2600/actions/workflows/codeql.yml/badge.svg)](https://github.com/CyanAutomation/judokon-2600/actions/workflows/codeql.yml)

A terminal-style, text-first TypeScript implementation of JU-DO-KON! Classic Battle.

**Players:** [Play the game online](https://judokon-2600.vercel.app/). **Developers and contributors:** follow [Getting started](#getting-started) and the [developer guide](docs/index.md).

![Illustrated preview of the JU-DO-KON! setup screen, with Classic Battle and Champion mode choices](docs/assets/game-setup-preview.svg)

## Getting started

Requires Node.js `>=26.0.0 <27` (the repository includes an `.nvmrc` file).

```sh
npm ci
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) to play locally. The Vite development server supports gameplay and deterministic match summaries, but it does not run the Vercel tactical-assessment function. To manually test tactical insight, use a configured Vercel Preview; the [deployment guide](docs/tactical-insight-deployment.md) covers the required environment variables and verification. See the [developer guide](docs/index.md) for the repository map and additional setup details.

## Gameplay

### Setup and scoring

Setup unfolds in four steps. **Quick start** uses the selected setup immediately (Classic, Absolute, and first-to-3 for a fresh profile); the four-step flow remains available for changing each option:

- Choose a mode: **Classic** or **Champion**.
- Choose a division: **Absolute** open-weight or **Weight** class. Weight division offers the 14 catalogue classes `-48`, `-52`, `-57`, `-60`, `-63`, `-66`, `-70`, `-73`, `-78`, `-81`, `-90`, `-100`, `+78`, and `+100`.
- Choose a match length: **Quick** (first-to-3), **Medium** (first-to-5), or **Long** (first-to-10).
- Start the match. With no saved preferences, setup defaults to Classic, Absolute, Random weight class, and Quick (first-to-3).

A selected stat is compared with the opponent's hidden value; the higher value earns a point. A match ends when a side reaches its target or after 25 rounds.

### Keyboard controls

- During setup, choose a mode with `C` (**Classic**) / `H` (**Champion**) and a division with `A` (**Absolute**) / `W` (**Weight**). Cycle match length with the arrow keys or `1`–`3`; if you chose Weight division, confirm its class with `Enter`, then confirm match length with `Enter` or `Space` to start.
- During a match, choose a stat with `1`–`5` (`power`, `speed`, `technique`, `kumikata`, `newaza`). Press `Enter` or `Space` to advance or replay, and quit with `Esc` or `Q`.
- Stat choices display as **Power**, **Speed**, **Technique**, **Kumi-kata**, and **Ne-waza**.
- Optional keyboard ticks and outcome beeps are muted by default. Toggle sound in **Game settings** during setup or with the **Sound** button in the match footer. The preference is stored in `localStorage`; when enabled, keyboard actions and match outcomes play audio feedback, and muting suppresses new feedback.

### Match summary and Champion mode

After each match, the summary recommends your best stat by most rounds won, then highest win rate, then earliest position in the displayed order (`power`, `speed`, `technique`, `kumikata`, `newaza`). It reports both wins and total selections; if no stat won a round, no recommendation is shown.

In **Champion** mode, you keep the same judoka while a rotating line-up of opponents changes each match. The **Current streak** counts consecutive rounds won at the end of the run: each win extends it, while either a loss or a draw resets it to zero. Earlier wins remain part of the run record but do not count toward the current streak.

The match screen foregrounds the score and current decision. During stat selection, paired fighter cards show your judoka’s full details and keep the opponent’s stat values hidden. Picking a stat reveals the opponent’s values. The **What do these stats mean?** disclosure explains Kumi-kata (grip fighting) and Ne-waza (ground work). After each round, the chosen stat and both values appear on the cards before the next action. Round history shows each round’s opponent, stat, values, and outcome during the current run. Saved sessions retain the existing compact history fields. Champion run metrics and the completed-match breakdown remain available in collapsed disclosures. Replay seed and notification-duration controls are under **Game settings** during setup; sound remains available during matches.

Selective snack bars rise from the bottom centre for replay-seed confirmations, restored matches, newly available Dojo notes, and quitting a match. A quit notice offers **Undo quit** for eight seconds and restores the match. The dock sits below gameplay and mobile setup controls, so it does not cover a stat choice or action. Confirmations last four seconds, restoration notices six seconds, and Dojo-note and quit notices eight seconds. Hovering, focusing a notification, or switching away from the tab pauses its timer. **Game settings → Notification duration** offers Standard, Extended (three times as long), or Until dismissed. A persistent polite live region announces status changes once; scores, round results, scouting information, and actionable errors remain visible in the app.

### Tactical insight

An optional post-match tactical insight interprets patterns in the player’s choices. The browser sends compact counts and outcome patterns to the same-origin `/api/tactical-assessment`; it does not send judoka IDs, stat values, replay seeds, local storage, or hidden opponent values. Application code assembles the insight text and omits low-confidence results; JEV supplies typed scores only. The deterministic summary remains authoritative, and the match remains playable when the optional insight is unavailable. Available Dojo notes can be opened from the notification’s **View** action or from **Match breakdown**; service unavailability is explained inside that breakdown. On Vercel, configure `OPENROUTER_API_KEY`; `JEV_MODEL` optionally overrides the default `~typesafe/jev-latest`. See the [tactical insight deployment guide](docs/tactical-insight-deployment.md) for setup and verification.

### Opponents, replay, and connection issues

Judoka are fetched directly from the public [Budokon catalogue API](https://budokon.scheimann.workers.dev/docs). Before each match, six judoka are drawn into a buffer so subsequent opponents can appear instantly. The seed button in the footer **Game settings** bar opens a dialog for an optional replay seed; otherwise each match gets a fresh seed. **Replay** starts a fresh match with the active seed and reproduces the same draws only while the Budokon dataset version and draw algorithm stay the same. The API returns both values, but this client does not retain them with the replay seed. Draw requests time out after 10 seconds. Connection failures, rejected access, missing endpoints, timeouts, and temporary server failures display persistent retry guidance in the status area. If copying a replay seed fails, its selectable text and manual-copy guidance remain in **Replay details**.

### Saved sessions and scout report

Reloading the same browser tab restores the last valid saved session, including its match, result, round history, replay seed, active weight class, and prefetched judoka. Only stable match states are saved: an in-progress stat selection and optional tactical assessment are not persisted. With no valid saved session, the app opens in setup.

The Budokon draw cache is page-local and reuses identical requests for five minutes. To inspect its hit, miss, coalescing, expiry, and eviction counters in browser developer tools, run `window.judokonCacheStats()`. Tactical assessments with identical features and model are reused for five minutes in Vercel's regional Runtime Cache; see the [caching guide](docs/caching.md) for scope and operational details.

While a round is open, a compact intel line shows the opponent's two highest-ranked stats. Ties follow the displayed stat order, and exact values stay hidden until you select a stat. Your own best stat is marked **Your best** on the stat choices. The scouting tip is optional and can be expanded beside the choices.

## Roadmap

Possible future features and their design constraints are collected in the [project roadmap](docs/roadmap.md). These proposals are not part of the current game.

## Install

JU-DO-KON! can be installed from Chromium on Android and desktop, or added to the Home Screen from iOS Safari. Open **Game settings** to use the Chromium install prompt or see the iOS Safari Home Screen hint. The installed app uses the same account-free game and local preferences as the website.

## Offline behaviour

After the first visit, the app shell and setup remain available offline. Starting or continuing a match needs a connection because judoka draws come from the Budokon service. If a draw fails while offline, JU-DO-KON! explains that you need to reconnect and lets you retry when the connection returns.

## Development and checks

Run the complete local quality gate with:

```sh
npm run check
```

This runs lint, tests, local Markdown link and style checks, and the production build. The build type-checks both the API (`tsc -p tsconfig.api.json`) and application (`tsc -p tsconfig.app.json`), then produces the bundle with `vite build`.

Run the Chromium browser smoke test with:

```sh
npx playwright install chromium
npm run test:e2e
```

GitHub Actions installs Chromium and runs the same smoke test. On failure, it uploads the Playwright report and traces as a workflow artifact.
Set `PLAYWRIGHT_CHROMIUM_EXECUTABLE` to use an already installed Chromium binary.

To run the documentation checks on their own:

```sh
npm run docs:check
```

Generate coverage-backed health metrics with:

```sh
npm run fallow:coverage
```

This runs the test suite with coverage, then runs Fallow with the generated Istanbul report for exact CRAP scores. Fallow discovers this repository's `api/**/*.ts` Vercel function routes as entry points, so no manual entry glob is needed.

The behavior IDs used by UI and game tests are documented in [Test behavior contracts](docs/test-contracts.md).

## Contributing and support

Report bugs or suggest changes through [GitHub Issues](https://github.com/CyanAutomation/judokon-2600/issues). For larger changes, open an issue first to discuss the approach. Pull requests should include relevant tests; when user-visible behavior changes, update the matching [test behavior contract](docs/test-contracts.md). Run `npm run check` before submitting.

## License

This project is distributed under the GNU General Public License v3.0. See [LICENSE](LICENSE) for the full license text.

## Vercel deployment

`vercel.json` configures Vercel to run `npm run check` before publishing Vite's `dist` output. This runs lint, tests, local Markdown link and style checks, and the production build in the deployment itself, so a failed quality check blocks the deployment. In Vercel, import `CyanAutomation/judokon-2600` and enable its Git integration. Pushes to `main` create production deployments; pull requests create preview deployments. The separate GitHub Actions workflow runs the same gate on every pull request and on pushes to `main`.
