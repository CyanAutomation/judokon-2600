import type { GameState } from "../state";

export const OFFLINE_DRAW_MESSAGE = "You're offline. Reconnect to start a match.";
export const OFFLINE_NEXT_ROUND_MESSAGE = "You're offline. Reconnect to continue the match.";
export const ONLINE_AGAIN_MESSAGE = "You're back online. You can retry your match.";
const OFFLINE_MESSAGES = new Set([OFFLINE_DRAW_MESSAGE, OFFLINE_NEXT_ROUND_MESSAGE]);

/** Refresh only the offline draw error after the browser reports connectivity restored. */
export function listenForOnlineRecovery(
  state: Pick<GameState, "errorMessage">,
  render: () => void,
  source: EventTarget = window
): () => void {
  const handleOnline = (): void => {
    if (!OFFLINE_MESSAGES.has(state.errorMessage)) return;
    state.errorMessage = ONLINE_AGAIN_MESSAGE;
    render();
  };

  source.addEventListener("online", handleOnline);
  return () => source.removeEventListener("online", handleOnline);
}
