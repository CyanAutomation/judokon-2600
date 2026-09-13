[![CI](https://github.com/CyanAutomation/judokon-2600/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/CyanAutomation/judokon-2600/actions/workflows/ci.yml) [![CodeQL](https://github.com/CyanAutomation/judokon-2600/actions/workflows/codeql.yml/badge.svg?branch=main)](https://github.com/CyanAutomation/judokon-2600/actions/workflows/codeql.yml)

# judokon-2600

A terminal-style, text-first TypeScript implementation of JU-DO-KON! Classic Battle.

## Gameplay

Setup unfolds in four steps: choose your mode (Classic Battle or Champion), pick your division (Absolute open-weight or Weight class — select a specific weight if desired), set the match length (Quick = first-to-3, Medium = first-to-5, Long = first-to-10), then play. Your selected stat is compared with the opponent's hidden value; the higher value earns a point. A match ends when a side reaches its target, or after 25 rounds.

Keyboard controls: choose game mode with `C` (Classic) / `H` (Champion); choose division with `A` (Absolute) / `W` (Weight); cycle match length with arrow keys or `1`–`3`; confirm weight-class choice with `Enter`; start the match by confirming length with `Enter` or `Space`. During a match, pick a stat with `1`–`5`, press `Enter` or `Space` to advance or replay, and quit with `Esc` or `Q`.

Optional keyboard ticks and outcome beeps are available in **Advanced**. They are muted by default and the preference is stored locally in the browser.

After each match, the match summary recommends your best stat using this ranking contract: most rounds won, then highest win rate, then the first stat in the displayed order (Power, Speed, Technique, Kumi-kata, Ne-waza). The displayed order makes a final tie deterministic. The recommendation reports both the number of wins and the total number of times that stat was selected; if no stat won a round, no recommendation is shown.

In **Champion** mode, you keep the same judoka while opponents rotate. The **Current streak** is the number of consecutive rounds won by the player at the end of the run: each win extends it, while either a loss or a draw resets it to zero. Earlier wins remain part of the run record but do not count toward the current streak.

Judoka are fetched directly from the public [Budokon catalogue API](https://budokon.scheimann.workers.dev/docs). The collapsed **Advanced** panel accepts an optional replay seed; otherwise each match gets a fresh seed. Draw requests time out after 10 seconds and display an error message.

While a round is open, a scout report shows the opponent's strongest stat (all tied stats when there is a tie). The opponent's exact values remain hidden until you select a stat.

## Future release: progression-enhanced scouting

Today's scout report is free and always visible. A future progression release could turn it into an earned, opt-in reward system that adds strategy without exposing exact opponent values:

1. Add a versioned player-profile store, initially backed by `localStorage`, with earned currency, unlocked buffs, and a migration path for a server-backed profile.
2. Award currency only after a completed match; use a small, fixed reward for participation plus a win bonus to avoid incentivising early quits.
3. Replace the free report with a **Scout report** buff consumed before a match. Its first level should reveal only the opponent's strongest stat; later levels could reveal a top-two set or a single stat range.
4. Keep the report hidden by default and present it as a deliberate action with a clear cost and remaining uses. Never reveal an exact opponent value.
5. Seed and record buff use in the match log so replayed matches remain explainable; add engine tests for reward earning, buff consumption, and the default no-scout experience.

## Potential future feature: career loop

A light career loop could reward wins with distinctive judoka unlocks, counter-pick and rivalry discovery, and short challenges such as winning three matches using Ne-waza. It should stay optional, preserving the crisp arcade-like match flow.

## Development

```sh
npm install
npm run dev
```

Run the complete local quality gate with:

```sh
npm run check
```

## Vercel deployment

`vercel.json` configures Vercel to run `npm run build` and serve Vite's `dist` output. In Vercel, import `CyanAutomation/judokon-2600` and enable its Git integration. Pushes to `main` create production deployments; pull requests create preview deployments. The separate GitHub Actions workflow runs the same lint, test, and build gate on every pull request and push.
