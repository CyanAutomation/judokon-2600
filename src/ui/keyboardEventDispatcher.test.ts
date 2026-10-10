import { describe, expect, it, vi } from "vitest";
import { createMockGameState, createMockMatch, createKeyboardEvent } from "../test/mocks";
import { handleGlobalKeyboardEvent, type GlobalKeyboardActions } from "./keyboardEventDispatcher";

function actions(): GlobalKeyboardActions {
  return {
    closeSeedModal: vi.fn(),
    keyboardTick: vi.fn(),
    handleIntro: vi.fn(),
    handleMatch: vi.fn()
  };
}

describe("handleGlobalKeyboardEvent", () => {
  it("closes the seed modal on Escape before general keyboard handling", () => {
    const event = createKeyboardEvent("Escape", { cancelable: true });
    const handlers = actions();

    handleGlobalKeyboardEvent(event, createMockGameState({ seedModalOpen: true }), handlers);

    expect(event.defaultPrevented).toBe(true);
    expect(handlers.closeSeedModal).toHaveBeenCalledOnce();
    expect(handlers.keyboardTick).not.toHaveBeenCalled();
    expect(handlers.handleIntro).not.toHaveBeenCalled();
  });

  it("leaves editable input events to the browser", () => {
    const event = createKeyboardEvent("ArrowDown");
    Object.defineProperty(event, "target", { value: document.createElement("input") });
    const handlers = actions();

    handleGlobalKeyboardEvent(event, createMockGameState(), handlers);

    expect(handlers.keyboardTick).not.toHaveBeenCalled();
    expect(handlers.handleIntro).not.toHaveBeenCalled();
    expect(handlers.handleMatch).not.toHaveBeenCalled();
  });

  it("ticks navigation keys and sends events to the active screen", () => {
    const event = createKeyboardEvent("ArrowDown");
    const handlers = actions();

    handleGlobalKeyboardEvent(event, createMockGameState(), handlers);

    expect(handlers.keyboardTick).toHaveBeenCalledOnce();
    expect(handlers.handleIntro).toHaveBeenCalledWith(event);
    expect(handlers.handleMatch).not.toHaveBeenCalled();

    const matchEvent = createKeyboardEvent("z");
    const matchHandlers = actions();
    handleGlobalKeyboardEvent(
      matchEvent,
      createMockGameState({ match: createMockMatch() }),
      matchHandlers
    );

    expect(matchHandlers.keyboardTick).not.toHaveBeenCalled();
    expect(matchHandlers.handleMatch).toHaveBeenCalledWith(matchEvent);
    expect(matchHandlers.handleIntro).not.toHaveBeenCalled();
  });
});
