import { describe, expect, it, vi } from "vitest";
import { createMockGameState, createMockMatch } from "../test/mocks";
import { renderApp } from "./render";
import { listenForOnlineRecovery, OFFLINE_DRAW_MESSAGE, OFFLINE_NEXT_ROUND_MESSAGE, ONLINE_AGAIN_MESSAGE } from "./offlineRecovery";

describe("offline draw recovery", () => {
  it.each([OFFLINE_DRAW_MESSAGE, OFFLINE_NEXT_ROUND_MESSAGE])("refreshes the visible status after %s", offlineMessage => {
    const match = offlineMessage === OFFLINE_NEXT_ROUND_MESSAGE ? createMockMatch({ phase: "awaitingNext" }) : null;
    const state = createMockGameState({ match, errorMessage: offlineMessage });
    const root = document.createElement("div");
    const source = new EventTarget();
    const render = vi.fn(() => renderApp(root, state));
    const visibleStatus = () => match ? root.querySelector("#status") : root.querySelector(".intro-status");
    const stopListening = listenForOnlineRecovery(state, render, source);
    render();

    expect(visibleStatus()?.textContent).toContain(offlineMessage);
    source.dispatchEvent(new Event("online"));

    expect(state.errorMessage).toBe(ONLINE_AGAIN_MESSAGE);
    expect(visibleStatus()?.textContent).toContain(ONLINE_AGAIN_MESSAGE);
    expect(root.querySelector(match ? "#next" : ".setup-actions button")).not.toBeNull();
    expect(render).toHaveBeenCalledTimes(2);

    stopListening();
    source.dispatchEvent(new Event("online"));
    expect(render).toHaveBeenCalledTimes(2);
  });
});
