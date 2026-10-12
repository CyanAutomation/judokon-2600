# Roadmap proposals

This document records possible future directions. These are proposals, not features in the current game. Any implementation should preserve the deterministic match rules and keep optional systems out of the core arcade flow.

## Progression-enhanced scouting

The current scout report is free and always visible. A future progression release could make scouting an earned, opt-in reward without revealing exact opponent values:

1. Add a versioned player-profile store, initially backed by `localStorage`, with earned currency, unlocked buffs, and a migration path for a server-backed profile.
2. Award currency only after a completed match; use a small, fixed reward for participation plus a win bonus to avoid incentivising early quits.
3. Replace the free report with a **Scout report** buff consumed before a match. Its first level should reveal only the opponent's strongest stat; later levels could reveal a top-two set or a single stat range.
4. Keep the report hidden by default and present it as a deliberate action with a clear cost and remaining uses. Never reveal an exact opponent value.
5. Seed and record buff use in the match log so replayed matches remain explainable; add engine tests for reward earning, buff consumption, and the default no-scout experience.

If scouting gains JEV support, deterministic disclosure rules should first produce a short list of safe, pre-approved facts. JEV may rank only those candidates for relevance to the player's recent choices; it must never inspect hidden opponent values or create a new disclosure. Future Budokon playstyle metadata should be consumed as flavour/context when available and must not change stat values.

## Career loop

A light career loop could reward wins with distinctive judoka unlocks, counter-pick and rivalry discovery, and short challenges such as winning three matches using Ne-waza. It should stay optional, preserving the crisp arcade-like match flow.

Future career challenges can follow the same boundary: code constructs valid challenge candidates, then JEV may rank those candidates against a small local play-history profile. Other possible extensions are an opt-in or internal in-match tactical state and matchup classifications based on Budokon playstyle metadata. JEV must not invent challenge rules or rewards, infer undisclosed stats, or predict match winners.
