# judokon-2600

A terminal-style, text-first TypeScript implementation of JU-DO-KON! Classic Battle.

## Gameplay

Start a 3, 5, or 10-point match, then choose one of five Judo stats. Your selected stat is compared with the opponent's hidden value; the higher value earns a point. A match ends when a side reaches its target, or after 25 rounds.

Keyboard controls: `1`–`5` choose a stat, `Enter`/`Space` advances to the next round, `Q` quits, and `H` toggles match settings.

Judoka are fetched directly from the public [Budokon catalogue API](https://budokon.scheimann.workers.dev/docs). The collapsed **Advanced** panel accepts an optional replay seed; otherwise each match gets a fresh seed. Draw requests time out after 10 seconds and expose a retry action.

## Future release: unlockable scouting

Opponent scouting is intentionally absent from the current game so every round begins with the same information. In a future progression release, it can return as an earned, opt-in reward:

1. Add a versioned player-profile store, initially backed by `localStorage`, with earned currency, unlocked buffs, and a migration path for a server-backed profile.
2. Award currency only after a completed match; use a small, fixed reward for participation plus a win bonus to avoid incentivising early quits.
3. Offer a **Scout report** as a pre-round, one-use buff. Its first level should reveal only the opponent's strongest stat; later levels could reveal a top-two set or a single stat range.
4. Keep the report hidden by default and present it as a deliberate action with a clear cost and remaining uses. Never reveal an exact opponent value.
5. Seed and record buff use in the round log so replayed matches remain explainable; add engine tests for reward earning, buff consumption, and no-information default play.

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
