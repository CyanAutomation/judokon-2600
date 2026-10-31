import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createSnackbar } from "./snackbar";

describe("[REQ-UI-019] selective snack bars", () => {
  let host: HTMLElement;
  let notices: ReturnType<typeof createSnackbar>;
  beforeEach(() => {
    vi.useFakeTimers();
    localStorage.clear();
    document.body.innerHTML = '<button id="origin">Copy</button><div id="dock"></div><main id="game" tabindex="-1"></main>';
    host = document.querySelector('#dock')!;
    notices = createSnackbar(host);
  });
  afterEach(() => { notices.dispose(); vi.useRealTimers(); });
  const message = () => host.querySelector('.snackbar-message')?.textContent;

  it("expires independently without replacing or moving focus from gameplay", () => {
    const game = document.querySelector('#game');
    document.querySelector<HTMLButtonElement>('#origin')!.focus();
    notices.show({ key: 'copy', message: 'Copied.', duration: 4000 });
    expect(message()).toBe('Copied.');
    expect(document.activeElement?.id).toBe('origin');
    vi.advanceTimersByTime(4000);
    expect(host.querySelector<HTMLElement>('.snackbar')!.hidden).toBe(true);
    expect(document.querySelector('#game')).toBe(game);
    expect(document.activeElement?.id).toBe('origin');
  });

  it("keeps the focused game control visible when the dock reduces the scroll area", () => {
    const scroll = document.createElement('div');
    scroll.className = 'app-scroll';
    const control = document.querySelector<HTMLButtonElement>('#origin')!;
    control.before(scroll);
    scroll.append(control);
    const scrollIntoView = vi.fn();
    control.scrollIntoView = scrollIntoView;
    control.focus();
    notices.show({ key: 'copy', message: 'Copied.', duration: 4000 });
    expect(scrollIntoView).toHaveBeenCalledWith({ block: 'nearest', inline: 'nearest' });
    expect(document.activeElement).toBe(control);
  });

  it("pauses overlapping hover and focus reasons, then resumes remaining time", () => {
    notices.show({ key: 'copy', message: 'Copied.', duration: 4000 });
    vi.advanceTimersByTime(1000);
    const bar = host.querySelector<HTMLElement>('.snackbar')!;
    bar.dispatchEvent(new Event('pointerenter'));
    host.querySelector<HTMLButtonElement>('[data-dismiss]')!.focus();
    bar.dispatchEvent(new Event('pointerleave'));
    vi.advanceTimersByTime(10000);
    expect(bar.hidden).toBe(false);
    document.querySelector<HTMLButtonElement>('#origin')!.focus();
    vi.advanceTimersByTime(2999);
    expect(bar.hidden).toBe(false);
    vi.advanceTimersByTime(1);
    expect(bar.hidden).toBe(true);
  });

  it("deduplicates, bounds the queue and discards all stale events on clear", () => {
    notices.show({ key: 'a', message: 'A', duration: 4000 });
    notices.show({ key: 'a', message: 'A', duration: 4000 });
    for (const key of ['b', 'c', 'd']) notices.show({ key, message: key, duration: 4000 });
    vi.advanceTimersByTime(4000);
    expect(message()).toBe('c');
    notices.clear();
    vi.advanceTimersByTime(20000);
    expect(host.querySelector<HTMLElement>('.snackbar')!.hidden).toBe(true);
    expect(host.querySelector('[role=status]')!.textContent).toBe('');
  });

  it("holds background events while a dialog is open", () => {
    notices.setSuspended(true);
    notices.show({ key: 'seed', message: 'Seed set.', duration: 4000 });
    vi.advanceTimersByTime(10000);
    expect(host.querySelector<HTMLElement>('.snackbar')!.hidden).toBe(true);
    notices.setSuspended(false);
    expect(message()).toBe('Seed set.');
    vi.advanceTimersByTime(3999);
    expect(host.querySelector<HTMLElement>('.snackbar')!.hidden).toBe(false);
  });

  it("replaces a changed confirmation without leaving an obsolete message visible", () => {
    notices.show({ key: 'seed', message: 'Replay seed set.', duration: 4000 });
    notices.show({ key: 'seed', message: 'Fresh matchups enabled.', duration: 4000 });
    expect(message()).toBe('Fresh matchups enabled.');
    vi.advanceTimersByTime(4000);
    expect(host.querySelector<HTMLElement>('.snackbar')!.hidden).toBe(true);
  });

  it.each([false, true])("protects a replacement when the queue is full (suspended: %s)", suspended => {
    notices.show({ key: 'a', message: 'Original', duration: 4000 });
    notices.show({ key: 'b', message: 'Queued B', duration: 4000 });
    notices.show({ key: 'c', message: 'Queued C', duration: 4000 });
    vi.advanceTimersByTime(1000);
    notices.setSuspended(suspended);

    notices.show({ key: 'a', message: 'Replacement', duration: 4000 });

    if (suspended) {
      expect(host.querySelector<HTMLElement>('.snackbar')!.hidden).toBe(true);
      notices.setSuspended(false);
    }
    expect(message()).toBe('Replacement');
    vi.advanceTimersByTime(3999);
    expect(message()).toBe('Replacement');
    vi.advanceTimersByTime(1);
    expect(message()).toBe('Queued B');
    vi.advanceTimersByTime(4000);
    if (!suspended) {
      // An immediately displayed replacement leaves both pending notices intact.
      expect(message()).toBe('Queued C');
      vi.advanceTimersByTime(4000);
    }
    // While suspended, retain the replacement and first pending notice within the two-item cap.
    expect(host.querySelector<HTMLElement>('.snackbar')!.hidden).toBe(true);
  });

  it("pauses expiry while the page is hidden", () => {
    notices.show({ key: 'copy', message: 'Copied.', duration: 4000 });
    vi.advanceTimersByTime(1000);
    vi.spyOn(document, 'hidden', 'get').mockReturnValue(true);
    document.dispatchEvent(new Event('visibilitychange'));
    vi.advanceTimersByTime(10000);
    expect(host.querySelector<HTMLElement>('.snackbar')!.hidden).toBe(false);
    vi.spyOn(document, 'hidden', 'get').mockReturnValue(false);
    document.dispatchEvent(new Event('visibilitychange'));
    vi.advanceTimersByTime(3000);
    expect(host.querySelector<HTMLElement>('.snackbar')!.hidden).toBe(true);
    vi.restoreAllMocks();
  });

  it("offers extended timing and no automatic dismissal", () => {
    notices.setDuration('manual');
    notices.show({ key: 'copy', message: 'Copied.', duration: 4000 });
    vi.advanceTimersByTime(60000);
    expect(host.querySelector<HTMLElement>('.snackbar')!.hidden).toBe(false);
    notices.setDuration('long');
    vi.advanceTimersByTime(11999);
    expect(host.querySelector<HTMLElement>('.snackbar')!.hidden).toBe(false);
    vi.advanceTimersByTime(1);
    expect(host.querySelector<HTMLElement>('.snackbar')!.hidden).toBe(true);
  });

  it("dismisses with Escape and restores origin focus without firing a game key", () => {
    document.querySelector<HTMLButtonElement>('#origin')!.focus();
    notices.show({ key: 'copy', message: 'Copied.', duration: 4000 });
    host.querySelector<HTMLButtonElement>('[data-dismiss]')!.focus();
    const listener = vi.fn();
    document.addEventListener('keydown', listener, { once: true });
    host.querySelector('button[data-dismiss]')!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
    expect(document.activeElement?.id).toBe('origin');
    expect(listener).not.toHaveBeenCalled();
    document.removeEventListener('keydown', listener);
  });

  it("keeps actions out of announcements and honors deliberate action focus", () => {
    const view = vi.fn(() => document.querySelector<HTMLElement>('#game')!.focus());
    notices.show({ key: 'notes', message: 'Dojo notes ready.', duration: 8000, action: { label: 'View', run: view } });
    expect(host.querySelector('[role=status]')!.textContent).toBe('Dojo notes ready.');
    host.querySelector<HTMLButtonElement>('[data-action]')!.click();
    expect(view).toHaveBeenCalledOnce();
    expect(document.activeElement?.id).toBe('game');
  });
});
