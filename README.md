# judokon-2600

A terminal-style, text-first TypeScript implementation of JU-DO-KON! Classic Battle.

## Gameplay

Start a 3, 5, or 10-point match, then choose one of five Judo stats. Your selected stat is compared with the opponent's hidden value; the higher value earns a point. A match ends when a side reaches its target, or after 25 rounds.

Keyboard controls: `1`–`5` choose a stat, `Enter`/`Space` advances to the next round, `Q` quits, and `H` toggles match settings.

Judoka are fetched directly from the public [Budokon catalogue API](https://budokon.scheimann.workers.dev/docs). A seed yields repeatable per-round draws through the API.

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
