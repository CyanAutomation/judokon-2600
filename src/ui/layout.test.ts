import { describe, expect, it, vi } from "vitest";
import { renderApp } from "./render";
import { layoutSetupActions } from "./layout";
import { createMockGameState } from "../test/mocks";
import { shouldHandleKeyboardEvent } from "./keyboardGuards";

describe('[REQ-UI-020] reserved notification layout', () => {
  it('moves mobile actions outside the scrolling content and returns them on resize', () => {
    const root = document.createElement('div');
    renderApp(root, createMockGameState({ match: null, setupStep: 'length' }));
    vi.stubGlobal('innerWidth', 390);
    layoutSetupActions(root);
    const action = root.querySelector('#start');
    expect(root.querySelector('.setup-action-dock')?.contains(action!)).toBe(true);
    expect(root.querySelector('.app-scroll')?.contains(action!)).toBe(false);
    vi.stubGlobal('innerWidth', 1440);
    layoutSetupActions(root);
    expect(root.querySelector('.app-scroll')?.contains(action!)).toBe(true);
    expect(root.querySelector('.setup-action-dock')).toBeNull();
    vi.unstubAllGlobals();
  });

  it('keeps focused setup actions focused through repeated mobile resize events', () => {
    const root = document.createElement('div');
    document.body.append(root);
    vi.stubGlobal('innerWidth', 390);
    renderApp(root, createMockGameState({ match: null, setupStep: 'length' }));
    const button = root.querySelector<HTMLButtonElement>('#start')!;
    button.focus();
    layoutSetupActions(root);
    expect(document.activeElement).toBe(button);
    vi.stubGlobal('innerWidth', 1440);
    layoutSetupActions(root);
    expect(document.activeElement).toBe(button);
    root.remove();
    vi.unstubAllGlobals();
  });

  it.each(['Enter', ' ', 'Escape', 'q', '1'])('leaves notification %s keys to their native controls', key => {
    const bar = document.createElement('div');
    bar.className = 'snackbar';
    bar.innerHTML = '<button><span>View</span></button>';
    const event = new KeyboardEvent('keydown', { key });
    Object.defineProperty(event, 'target', { value: bar.querySelector('span') });
    expect(shouldHandleKeyboardEvent(event)).toBe(false);
  });
});
