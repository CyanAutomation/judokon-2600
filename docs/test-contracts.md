# Test behavior contracts

These IDs give the UI and game tests a stable link to observable product behavior. They refine the gameplay and keyboard contracts described in the [README](../README.md#gameplay). Update the matching test and this contract together when behavior changes.

| ID | Contract | README source |
| --- | --- | --- |
| REQ-UI-001 | With no active match, render setup; with an active match, render the match controls. | [Gameplay flow](../README.md#gameplay) |
| REQ-UI-002 | The active match scoreboard exposes both current scores and the target score. | [Scoring and match length](../README.md#gameplay) |
| REQ-UI-003 | After a round resolves, show the selected stat and both compared values. | [Stat comparison](../README.md#gameplay) |
| REQ-UI-004 | Before resolution, show the opponent's strongest stat or tied strongest stats without exposing their exact values. | [Scout report](../README.md#gameplay) |
| REQ-CHAMPION-005 | Champion progress is shown only in Champion mode. Its current streak counts consecutive trailing player wins and resets after a loss or draw; the run record still includes earlier wins. | [Champion mode](../README.md#gameplay) |
| REQ-UI-006 | Round history lists resolved rounds and is omitted before any round has resolved. | [Match flow](../README.md#gameplay) |
| REQ-GAME-007 | Quitting returns to setup, clears active-run data, and removes the saved active match. | [Keyboard controls](../README.md#gameplay) |
