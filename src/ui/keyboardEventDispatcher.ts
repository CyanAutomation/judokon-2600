import type { GameState } from "../state";
import { isSeedModalEscape, shouldHandleKeyboardEvent, shouldPlayKeyboardTick } from "./keyboardGuards";

export interface GlobalKeyboardActions {
  closeSeedModal: () => void;
  keyboardTick: () => void;
  handleIntro: (event: KeyboardEvent) => void;
  handleMatch: (event: KeyboardEvent) => void;
}

/** Apply global keyboard guards and route allowed events to the active screen. */
export function handleGlobalKeyboardEvent(
  event: KeyboardEvent,
  state: GameState,
  actions: GlobalKeyboardActions
): void {
  if (isSeedModalEscape(event, state)) {
    event.preventDefault();
    actions.closeSeedModal();
    return;
  }

  if (!shouldHandleKeyboardEvent(event)) return;
  if (shouldPlayKeyboardTick(event.key)) actions.keyboardTick();
  if (state.match) actions.handleMatch(event);
  else actions.handleIntro(event);
}
