# judokon-2600 Documentation

## Project overview

judokon-2600 is a terminal-style, text-first battle simulator for JU-DO-KON! Classic Battle, built with TypeScript and Vite. Players select stats to compare against opponents drawn from the public Budokon catalogue API. Two game modes are available: **Classic** (fresh pair each round) and **Champion** (player judoka persists while opponents rotate). Matches resolve by comparing single stats per round until one side reaches the target score or 25 rounds expire. The match summary ranks stats by wins, then win rate, then display order to recommend a best stat. Sound effects (keyboard ticks and outcome beeps) and replay seeds are optional features.

## Local setup

Prerequisites: Node.js >= 22.12.0 < 23.

```sh
npm install       # install dependencies
npm run dev       # start the Vite development server
npm run check     # lint + test + build quality gate
npm run build     # production build (tsc + vite build)
```

The development server serves the SPA at port 5173. Tests run via Vitest (`npm run test`).

## Repository layout

| Directory / File | Purpose |
| --- | --- |
| `src/api/` | Budokon client, caching, request/response validation, shared types (`StatKey`, `Judoka`, `Stats`) |
| `src/audio.ts` | Sound-effect layer: keyboard tick and outcome beep synthesis via Web Audio API |
| `src/game/` | Core logic — `game.ts` (match creation, stat resolution, summary ranking), `orchestrator.ts` (draw buffer, round advancement, seed management) |
| `src/main.ts` | Application bootstrap: state init, audio setup, dependency wiring |
| `src/state.ts` | Game-state type definitions, persistence helpers, and setup-step tracking |
| `src/ui/` | Rendering components, event handlers, input controls, templates for intro/match screens |
| `package.json` | Dependency declarations and scripts (`dev`, `build`, `test`, `lint`, `check`) |
| `tsconfig.app.json` | TypeScript compilation targets for the application bundle |
| `vite.config.ts` | Vite build config; Vitest environment set to jsdom |
| `vercel.json` | Vercel deployment directives (framework, build/output paths, cache headers) |

## Key modules

- `src/game/orchestrator.ts` — Draw batch size of 6 judoka, 14 weight classes (−48 through +100 plus +78/+100 overweights), match lengths [3, 5, 10], and 650 ms resolution delay before revealing results.
- `src/game/game.ts` — `selectStat` compares player vs opponent values; `matchSummary` computes champion streak as consecutive trailing wins; `selectBestStat` sorts by wins desc, win rate desc, STAT_KEYS index asc.
- `src/ui/keyboardHandlers.ts` — Full keymap: mode (C/H), division (A/W), length (arrows/1–3), stat selection (1–5), next/replay (Enter/Space), quit (Esc/Q).
