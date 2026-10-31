# Selective snack bar implementation plan

Status: implemented locally; production deployment pending.

## Assessment

Reviewed the production site at <https://judokon-2600.vercel.app/> on
31 October 2026, alongside the source templates and event orchestration.
Browser inspection covered desktop setup (1440 × 900), mobile setup,
stat selection, round results, and a completed five-round match (390 × 844).

The current hierarchy works well: score, opponent intel, stat choices, and
round results are foregrounded; reference material lives in disclosures.
Preserve that hierarchy. Snack bars should surface occasional events that
otherwise go unnoticed, rather than repeat every visible state change.

Specific opportunities and constraints:

- Replay-copy feedback currently appears separately below Replay details.
  A transient confirmation would be easier to notice near the viewport.
- Saving a replay seed closes its dialog without an explicit confirmation.
- A restored session has no explicit restoration notice.
- Optional tactical assessment finishes asynchronously. Dojo notes are inside
  the collapsed Match breakdown, so their arrival can be missed. Assessment
  service issues currently use the primary game error channel.
- Round outcomes already have prominent, persistent panels. Repeating every
  outcome would create noise and compete with the next action.
- Mobile weight and length setup use a fixed bottom action group at z-index 15.
  Mobile stat selection uses most of the viewport. Merely putting a floating
  snack bar above these areas would still obscure meaningful content.
- `renderApp` replaces the application root on every render. Notification
  expiry must not rerender the game or reset focus, disclosures, or timers.

## Event policy

| Event | Treatment | Initial duration |
| --- | --- | --- |
| Replay seed copied successfully | Snack bar: “Replay seed copied.” | 4 seconds |
| Replay seed saved or cleared | Snack bar: “Replay seed set.” / “Fresh matchups enabled.” | 4 seconds |
| Valid saved match restored | One notice: “Match restored — round N.” | 6 seconds |
| Visible Dojo notes become available | “Dojo notes ready.” with View action | 8 seconds |
| Optional insight unavailable | Persistent explanation in Match breakdown; one short notice only if needed to explain an expected result | 6 seconds |
| Copy fails | Persistent feedback beside copy controls and selectable seed; no timed-only error | Until resolved |
| Draw, connection, or start fails | Persistent contextual error with retry guidance | Until resolved |
| Loading or stat resolution pending | Existing inline pending feedback and disabled controls | Until complete |
| Mode, division, length, sound changes | Existing selected state/button label | No snack bar |
| Round outcome, final score, scouting, streak | Existing result, score, intel, and Champion UI | No snack bar |

Do not notify merely because a tactical assessment object exists: only notify
when it produces at least one rendered Dojo note. Do not expose provider/API-key
diagnostics as the primary player-facing game status.

## Placement that prevents occlusion

Use one dedicated notification dock at the viewport bottom centre, with an opaque
terminal-style surface, short copy, and an explicit dismiss control. Match the
existing font, border, spacing, and focus tokens. Rise from the bottom over
180ms, with no animation when reduced motion is requested. Avoid a dimmed backdrop.

Make the viewport a layout with a scrollable application region and a separate
notification region. The dock occupies real layout space outside the application
scroll region; it must never be layered over content. When visible, it reduces
the available application height. Preserve the player's scroll position and keep
the focused control visible. Include the bottom safe-area inset once.

The mobile setup action group moves into a reserved layout region above the
notification dock. On desktop it returns to its original location in setup.
Resize events preserve the focused action.
Account for the full measured dock height, including wrapped text and zoom;
a hard-coded bottom offset or extra document padding alone is insufficient.

Use the same dock on desktop, with a bounded message width aligned to the
980px content area. Show only one message. On short viewports the dock uses compact spacing and a bounded height, while
the application remains independently scrollable. Visual viewport resize events
account for the software keyboard. Background notices are suppressed while the
seed dialog is open; still-relevant feedback appears after close.

## Implementation sequence

1. Add an ephemeral notification controller, separate from saved `GameState`.
   Give events unique IDs, semantic deduplication keys, a match/operation scope,
   duration, optional action, and dismissal reason. Replace repeated events;
   bound the queue and discard stale events on replay, quit, or match change.
2. Mount the notification live region and dock outside the root replaced by
   `renderApp`. Update only the dock when showing or dismissing a message.
   Manage timer cancellation and disposal centrally. Emit events from successful
   operations, not from template rendering or repeated state inspection.
3. Establish the reserved layout and migrate mobile setup actions before wiring
   any notices. Check match-ready focus and `scrollIntoView` against the new
   scroll container. Preserve existing dialogs and disclosure state.
4. Wire copy success, seed save/clear, and valid session restore first. Retain
   manual-copy feedback on clipboard failure. Guard late clipboard completion
   and tactical results against the originating match/operation.
5. Share the Dojo-note visibility calculation between rendering and notification
   selection. Add a View action that opens Match breakdown, scrolls to the notes,
   and deliberately focuses their heading. Keep the notes available after expiry.
   Separate optional assessment issues from blocking gameplay errors.
6. Update the documented UI behavior contracts and add focused tests for the
   controller, event producers, layout, and keyboard behavior.

## Timing and accessibility

Use polite, atomic status announcements without stealing focus. Announce each
event once; remove duplicate live announcements from migrated seed feedback.
Keep persistent gameplay announcements intact. Put action and dismiss buttons
outside the announcing text node, with accessible names and visible focus.

Pause expiry while hovered, keyboard focus is within the dock, or the document
is hidden. Resume using remaining time. Offer an extended-duration/no-auto-hide
preference for people who need more time. No essential information or recovery
action may exist only in a timed message. Respect reduced motion.

A dock button must not trigger global gameplay shortcuts: guard Enter, Space,
Escape, Q, and digit handling using the event target. Escape may dismiss the
focused snack bar without quitting the match; dialog handling takes precedence.
If a focused dismiss/action control is removed, restore focus to a logical
surviving control, without overriding intentional focus changes.

## Acceptance criteria

- At 320, 390, 560, and 1440px widths, plus short landscape and 200% zoom,
  dock and key controls have no intersecting bounding rectangles. All content
  remains reachable, including the final stat and fixed setup actions.
- Validate setup, active round, pending resolution, round result, match over,
  expanded settings/history/breakdown, seed dialog, and software keyboard.
- Expiry does not rerender gameplay, collapse disclosures, lose focus, change
  score, or restart pending operations. Paused and repeated events behave correctly.
- Late asynchronous completions cannot surface a notice for a previous match.
- Screen readers announce each notice once; keyboard actions do not also play
  the game. Focus remains predictable after dismissal or View.
- Clipboard failure, slow/offline draw requests, and missing tactical insight
  retain usable persistent explanations and recovery routes.
- Run the repository quality gate, then validate the resulting Vercel preview
  on desktop and mobile before production rollout.

## Local verification

Tests were written before the notification controller and event integration,
then expanded to reproduce focus loss during resize and seed-dialog renders.
The automated tests cover timers, overlapping pause reasons, hidden tabs,
manual/extended duration, queue bounds, changed confirmations,
clipboard operation scope, visible-note eligibility, and optional-service failure.

Chromium browser checks cover real catalogue gameplay and restored sessions,
plus controlled responses for Dojo notes and clipboard failures. Bounding-box
checks confirm that the application, setup actions, and snack bar do not overlap
at 320 × 640, 390 × 844, 560 × 700, 1440 × 900, 844 × 390, and 320 × 420.
The browser also verifies View-action focus, persistent manual-copy recovery,
disclosure preservation, and expiry without replacing gameplay DOM. Additional
checks cover reduced motion, seed-dialog suppression at keyboard-sized heights,
focus across breakpoint changes, emulated 200% desktop reflow (720 × 450 at
device scale 2), draw failure/retry, and unavailable tactical insight. Expanded
Game settings now reserve space at every width after browser checks exposed an
intermediate-width popover overlapping Start.

A configured Vercel preview and physical-device/screen-reader checks remain
release validation tasks; local tactical integration uses controlled responses,
not a live model request.
