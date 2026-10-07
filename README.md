# judokon-2600

A terminal-style, text-first TypeScript implementation of JU-DO-KON! Classic Battle.

## Gameplay

Setup unfolds in four steps: choose your mode (**Classic** or **Champion**), pick your division (**Absolute** open-weight or **Weight** class — choose one of 14 specific weight classes from −48 to +100), set the match length (**Quick** = first-to-3, **Medium** = first-to-5, **Long** = first-to-10), then play. Your selected stat is compared with the opponent's hidden value; the higher value earns a point. A match ends when a side reaches its target, or after 25 rounds.

Keyboard controls: choose game mode with `C` (**Classic**) / `H` (**Champion**); choose division with `A` (**Absolute**) / `W` (**Weight**); cycle match length with arrow keys or `1`–`3`; confirm weight-class choice with `Enter`; start the match by confirming length with `Enter` or `Space`. During a match, pick a stat with `1`–`5` (`power`, `speed`, `technique`, `kumikata`, `newaza`), press `Enter` or `Space` to advance or replay, and quit with `Esc` or `Q`.

Stat choices display as **Power**, **Speed**, **Technique**, **Kumi-kata**, and **Ne-waza**.

Optional keyboard ticks and outcome beeps are available in **Advanced options**. They are muted by default and the preference is stored in `localStorage`.

After each match, the match summary recommends your best stat using this ranking contract: most rounds won, then highest win rate, then the first stat in the displayed order (`power`, `speed`, `technique`, `kumikata`, `newaza`). The tiebreak favors whichever stat appears earliest in that list. The recommendation reports both the number of wins and the total number of times that stat was selected; if no stat won a round, no recommendation is shown.

An optional post-match tactical insight can interpret patterns in the player's recorded choices, such as repeated losses with a favoured stat or changes after losing. The deterministic summary remains authoritative: JEV cannot change round outcomes, scores, match length, replay behavior, or the best-stat recommendation. The browser sends only compact counts and outcome patterns to the same-origin `/api/tactical-assessment` Vercel Function. It does not send judoka IDs, stat values, replay seeds, local storage, or hidden opponent values. Insight text is assembled by application code; JEV supplies only typed scores, and low-confidence results are omitted. If the API key is missing or rejected, or the route/provider cannot be reached, a short status message explains why tactical insight is unavailable; the match summary remains available. On Vercel, set `OPENROUTER_API_KEY` and `JEV_ASSESSMENT_RATE_LIMIT_ID`. The latter must match a Vercel Firewall rate-limit rule scoped to `POST /api/tactical-assessment` and keyed by client IP; a starting limit of 20 requests per 10 minutes can be adjusted to expected traffic. The route fails closed without a configured or available rule, so it will not call OpenRouter. Keep the provider key in Production unless Preview deployments need it. `JEV_MODEL` optionally selects another model and defaults to `~typesafe/jev-latest`. Plain `npm run dev` uses Vite's static development server without the Vercel function, so tactical insight is unavailable there and the deterministic summary continues to work.

In **Champion** mode, you keep the same judoka while opponents rotate. The **Current streak** counts consecutive rounds won at the end of the run: each win extends it, while either a loss or a draw resets it to zero. Earlier wins remain part of the run record but do not count toward the current streak.

Judoka are fetched directly from the public [Budokon catalogue API](https://budokon.scheimann.workers.dev/docs). Before each match six judoka are drawn into a buffer so subsequent opponents can appear instantly. The seed button in the footer **Advanced options** bar opens a dialog for an optional replay seed; otherwise each match gets a fresh seed. A seed reproduces the same draws only while the Budokon dataset version and draw algorithm stay the same. The API returns both values, but this client currently does not retain them with the replay seed. Draw requests time out after 10 seconds. Connection failures, rejected access, missing endpoints, timeouts, and temporary server failures display retry guidance in the status area.

Reloading the same browser tab restores the last valid saved session, including its match, result, round history, replay seed, active weight class, and prefetched judoka. The app saves only stable match states: an in-progress stat selection and optional tactical assessment are not persisted. With no valid saved session, the app opens in setup.

While a round is open, a scout report shows the opponent's strongest stat (all tied stats when there is a tie). The opponent's exact values remain hidden until you select a stat.

## Future release: progression-enhanced scouting

Today's scout report is free and always visible. A future progression release could turn it into an earned, opt-in reward system that adds strategy without exposing exact opponent values:

1. Add a versioned player-profile store, initially backed by `localStorage`, with earned currency, unlocked buffs, and a migration path for a server-backed profile.
2. Award currency only after a completed match; use a small, fixed reward for participation plus a win bonus to avoid incentivising early quits.
3. Replace the free report with a **Scout report** buff consumed before a match. Its first level should reveal only the opponent's strongest stat; later levels could reveal a top-two set or a single stat range.
4. Keep the report hidden by default and present it as a deliberate action with a clear cost and remaining uses. Never reveal an exact opponent value.
5. Seed and record buff use in the match log so replayed matches remain explainable; add engine tests for reward earning, buff consumption, and the default no-scout experience.

If scouting gains JEV support, deterministic disclosure rules should first produce a short list of safe, pre-approved facts. JEV may rank only those candidates for relevance to the player's recent choices; it must never inspect hidden opponent values or create a new disclosure. Future Budokon playstyle metadata should be consumed as flavour/context when available and must not change stat values.

## Potential future feature: career loop

A light career loop could reward wins with distinctive judoka unlocks, counter-pick and rivalry discovery, and short challenges such as winning three matches using Ne-waza. It should stay optional, preserving the crisp arcade-like match flow.

Future career challenges can follow the same boundary: code constructs valid challenge candidates, then JEV may rank those candidates against a small local play-history profile. Other possible extensions are an opt-in or internal in-match tactical state and matchup classifications based on Budokon playstyle metadata. JEV must not invent challenge rules or rewards, infer undisclosed stats, or predict match winners.

## Development

```sh
npm install
npm run dev
```

Run the complete local quality gate with:

```sh
npm run check
```

This runs lint, test, and build in sequence (the build step compiles with `tsc -p tsconfig.app.json` then produces the bundle with `vite build`).

The behavior IDs used by UI and game tests are documented in [Test behavior contracts](docs/test-contracts.md).

## Vercel deployment

`vercel.json` configures Vercel to run `npm run check` before publishing Vite's `dist` output. This runs lint, tests, and build in the deployment itself, so a failed quality check blocks the deployment. In Vercel, import `CyanAutomation/judokon-2600` and enable its Git integration. Pushes to `main` create production deployments; pull requests create preview deployments. The separate GitHub Actions workflow runs the same gate on every pull request and on pushes to `main`.
