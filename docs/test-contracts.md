# Test behavior contracts

These IDs give the UI and game tests a stable link to observable product behavior. They refine the gameplay and keyboard contracts described in the [README](../README.md#gameplay). Update the matching test and this contract together when behavior changes.

| ID | Contract | README source |
| --- | --- | --- |
| REQ-UI-001 | With no active match, render setup; with an active match, render the match controls. | [Gameplay flow](../README.md#gameplay) |
| REQ-UI-002 | The active match scoreboard exposes both current scores and the target score. | [Scoring and match length](../README.md#gameplay) |
| REQ-UI-003 | After a round resolves, show the selected stat and both compared values in the head-to-head cards before the next action. | [Stat comparison](../README.md#gameplay) |
| REQ-UI-004 | During stat selection, show the opponent's two highest-ranked stats in descending order, using displayed stat order for ties and hiding exact values. Mark the player's highest stat as “Your best.” | [Scout report](../README.md#gameplay) |
| REQ-CHAMPION-005 | Champion progress is shown only in Champion mode. Its current streak counts consecutive trailing player wins and resets after a loss or draw; the run record still includes earlier wins. | [Champion mode](../README.md#gameplay) |
| REQ-UI-006 | Round history lists each resolved round's opponent, stat, compared values, and outcome; older version 1 saved sessions keep their existing history format. | [Match flow](../README.md#gameplay) |
| REQ-GAME-007 | Quitting returns to setup, clears active-run data, and removes the saved active match. | [Keyboard controls](../README.md#gameplay) |
| REQ-GAME-023 | Quitting offers an 8-second Undo action that restores the prior match and preferences with pending animation state cleared. | [Keyboard controls](../README.md#gameplay) |
| REQ-GAME-008 | A selected weight class constrains the initial catalogue draw to that class. | [Gameplay flow](../README.md#gameplay) |
| REQ-GAME-009 | The same replay seed selects the same random weight class while the supported weight list is unchanged. | [Gameplay flow](../README.md#gameplay) |
| REQ-KEYBOARD-008 | Setup and match keyboard controls follow the documented shortcuts, busy draws cannot start or advance another operation, and native interactive controls keep their own activation keys. | [Keyboard controls](../README.md#gameplay) |
| REQ-GAME-010 | Reloading the same tab restores valid saved session data; only stable match state is persisted, without pending stat selections or optional tactical assessments. | [Gameplay flow](../README.md#gameplay) |
| REQ-GAME-011 | Setup offers the documented first-to-3, first-to-5, and first-to-10 match lengths. | [Gameplay flow](../README.md#gameplay) |
| REQ-GAME-012 | Weight division offers the 14 documented catalogue classes in their listed order. | [Gameplay flow](../README.md#gameplay) |
| REQ-GAME-013 | Starting from setup creates the first match with the selected target and allows a round to resolve. | [Gameplay flow](../README.md#gameplay) |
| REQ-UI-008 | Setup header context reflects the chosen format and target; active-match header reflects the current round and format while the scoreboard presents score and target. | [Gameplay flow](../README.md#gameplay) |
| REQ-UI-009 | The visible status shows draw progress, actionable draw failures, and the current round state; status changes are announced from the persistent notification dock. | [Gameplay flow](../README.md#gameplay) |
| REQ-UI-010 | Editing the replay seed in its dialog changes the draft; the active preference changes only when the draft is saved. | [Gameplay flow](../README.md#gameplay) |
| REQ-UI-011 | During stat selection, paired fighter cards show the player's name, rarity, country, weight, and full stats; opponent values stay hidden until a pick and then reveal. After a round, both cards show the selected stat and compared values before the next action. | [Stat comparison](../README.md#gameplay) |
| REQ-UI-012 | Stat choices use the documented display labels Power, Speed, Technique, Kumi-kata, and Ne-waza. | [Keyboard controls](../README.md#gameplay) |
| REQ-UI-013 | With no saved preferences, setup opens at the mode step with Classic, Absolute, Random weight class, and first-to-3 selected. | [Gameplay flow](../README.md#gameplay) |
| REQ-UI-014 | Setup presents one decision stage at a time, preserves earlier choices in summaries, and uses a native radio group for the active options. | [Gameplay flow](../README.md#gameplay) |
| REQ-UI-015 | Before starting, the final setup stage shows the selected target and scoring rule alongside a Start action. | [Gameplay flow](../README.md#gameplay) |
| REQ-AUDIO-016 | Optional audio feedback is muted by default, can be toggled during setup and active matches, and only plays keyboard or outcome feedback while enabled. | [Gameplay flow](../README.md#gameplay) |
| REQ-GAME-017 | Replaying a completed match starts a fresh match with the active replay seed. | [Gameplay flow](../README.md#gameplay) |
| REQ-UI-018 | Seed confirmations, valid session restoration, Dojo-note arrival, and quit Undo use one bottom-centre snack bar; essential gameplay and error information stays persistent. | [Notification plan](snackbar-plan.md) |
| REQ-UI-019 | Snack bar expiry preserves gameplay DOM and focus, pauses on hover/focus/hidden tabs, supports extended/manual duration, and bounds/deduplicates queued notices. | [Notification plan](snackbar-plan.md) |
| REQ-UI-020 | Notification and mobile action docks reserve real space; resizing preserves focused actions and notification shortcuts never dispatch gameplay commands. | [Notification plan](snackbar-plan.md) |
| REQ-UI-021 | Late clipboard and tactical responses cannot notify a previous match; clipboard recovery and optional-service failures remain in their contextual disclosures. | [Notification plan](snackbar-plan.md) |
| REQ-UI-022 | Stat choice labels, values, markers, and shortcuts remain inside their buttons at desktop and mobile widths. | [Keyboard controls](../README.md#gameplay) |
| REQ-UI-024 | A status change, including a round result, is announced exactly once through a polite live region that survives app rerenders. | [Gameplay flow](../README.md#gameplay) |
| REQ-UI-025 | Quick start begins a match from the selected setup while the full staged setup flow remains available. | [Setup and scoring](../README.md#gameplay) |
| REQ-UI-026 | The stat glossary explains Kumi-kata as grip fighting and Ne-waza as ground work. | [Stat comparison](../README.md#gameplay) |
| REQ-UI-027 | The intro hero heading is continuous text and wraps naturally without forcing a word onto its own line. | [Setup and scoring](../README.md#gameplay) |
| REQ-PWA-028 | The manifest identifies the app and declares existing SVG and PNG icons with the correct sizes and separate any/maskable purposes. | [Install](../README.md#install) |
| REQ-PWA-029 | In production, the service worker precaches the app shell, uses network-first navigation with a cached index fallback, and leaves cross-origin, non-GET, `/api/*`, and Vercel Insights requests untouched. | [Service worker](caching.md#service-worker) |
| REQ-UI-030 | A failed offline draw shows persistent reconnect guidance; an online event refreshes that status and keeps setup retry controls available. | [Offline behaviour](../README.md#offline-behaviour) |
| REQ-PWA-031 | A waiting update prompts through the notification dock only on setup or after a match; Reload requests activation and reloads once the worker takes control. | [Service worker](caching.md#service-worker) |
| REQ-PWA-032 | Game settings offer Chromium's install prompt when available, show the iOS Safari Home Screen hint where no prompt exists, and hide the offer in standalone mode or after installation. | [Install](../README.md#install) |
