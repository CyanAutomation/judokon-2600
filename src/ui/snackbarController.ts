import type { Notice, NoticeDuration, Snackbar } from "./noticeTypes";
import { getNoticeDuration, saveNoticeDuration } from "./noticePreferences";

/** Stateful notification dock controller; all interactions are scoped to its DOM. */
class SnackbarController implements Snackbar {
  private readonly bar: HTMLElement;
  private readonly message: HTMLElement;
  private readonly announcement: HTMLElement;
  private readonly action: HTMLButtonElement;
  private readonly dismissButton: HTMLButtonElement;
  private readonly abort = new AbortController();
  private current: Notice | undefined;
  private queue: Notice[] = [];
  private timer: ReturnType<typeof setTimeout> | undefined;
  private started = 0;
  private remaining = 0;
  private origin: HTMLElement | null = null;
  private suspended = false;
  private disposed = false;
  private duration: NoticeDuration;
  private readonly pauses = new Set<string>();

  constructor(host: HTMLElement) {
    host.classList.add("notification-dock");
    host.innerHTML = '<div class="snackbar" role="group" aria-label="Notification" hidden><p class="snackbar-message"></p><button type="button" class="control control--quiet quiet" data-action hidden></button><button type="button" class="control control--quiet quiet" data-dismiss aria-label="Dismiss notification">Dismiss</button></div><span class="visually-hidden" role="status" aria-live="polite" aria-atomic="true"></span>';
    this.bar = host.querySelector<HTMLElement>(".snackbar")!;
    this.message = host.querySelector<HTMLElement>(".snackbar-message")!;
    this.announcement = host.querySelector<HTMLElement>('[role="status"]')!;
    this.action = host.querySelector<HTMLButtonElement>("[data-action]")!;
    this.dismissButton = host.querySelector<HTMLButtonElement>("[data-dismiss]")!;
    this.duration = getNoticeDuration();
    if (document.hidden) this.pauses.add("hidden");
    this.bindEvents();
  }

  show(notice: Notice): void {
    if (this.disposed) return;
    const replacingCurrent = this.current?.key === notice.key;
    if (replacingCurrent) {
      if (this.current?.message === notice.message) return;
      this.dismiss(true, false);
      this.queue.unshift(notice);
    } else {
      const index = this.queue.findIndex(item => item.key === notice.key);
      if (index >= 0) this.queue[index] = notice;
      else this.queue.push(notice);
    }
    this.showNext();
    if (this.queue.length > 2) {
      // A suspended replacement stays first; ordinary overflow drops the oldest pending notice.
      if (replacingCurrent) this.queue.pop();
      else this.queue.shift();
    }
  }

  clear(): void {
    this.queue = [];
    this.dismiss();
  }

  setSuspended(value: boolean): void {
    if (this.suspended === value) return;
    this.stop();
    this.suspended = value;
    this.bar.hidden = this.suspended || !this.current;
    if (!this.suspended) {
      this.showNext();
      this.schedule();
    }
  }

  setDuration(value: NoticeDuration): void {
    this.duration = value;
    saveNoticeDuration(value);
    this.stop();
    if (this.current) this.remaining = this.durationFor(this.current);
    this.schedule();
  }

  dispose(): void {
    this.disposed = true;
    this.queue = [];
    this.dismiss();
    this.abort.abort();
  }

  private bindEvents(): void {
    const listenerOptions = { signal: this.abort.signal };
    this.bar.addEventListener("pointerenter", () => this.pause("hover", true), listenerOptions);
    this.bar.addEventListener("pointerleave", () => this.pause("hover", false), listenerOptions);
    this.bar.addEventListener("focusin", () => this.pause("focus", true), listenerOptions);
    this.bar.addEventListener("focusout", event => {
      if (!(event.relatedTarget instanceof Node) || !this.bar.contains(event.relatedTarget)) this.pause("focus", false);
    }, listenerOptions);
    this.bar.addEventListener("keydown", event => {
      // Native button activation still works; gameplay shortcuts never receive these keys.
      event.stopPropagation();
      if (event.key === "Escape") {
        event.preventDefault();
        this.dismiss();
      }
    }, listenerOptions);
    this.dismissButton.addEventListener("click", () => this.dismiss(), listenerOptions);
    this.action.addEventListener("click", () => {
      const run = this.current?.action?.run;
      this.dismiss(false, false);
      run?.();
      this.showNext();
    }, listenerOptions);
    document.addEventListener("visibilitychange", () => this.pause("hidden", document.hidden), listenerOptions);
  }

  private stop(): void {
    if (this.timer === undefined) return;
    clearTimeout(this.timer);
    this.timer = undefined;
    this.remaining = Math.max(0, this.remaining - (Date.now() - this.started));
  }

  private schedule(): void {
    this.stop();
    if (!this.current || this.suspended || this.pauses.size || this.duration === "manual") return;
    this.started = Date.now();
    this.timer = setTimeout(() => this.dismiss(), this.remaining);
  }

  private pause(reason: string, value: boolean): void {
    this.stop();
    if (value) this.pauses.add(reason);
    else this.pauses.delete(reason);
    this.schedule();
  }

  private durationFor(notice: Notice): number {
    return notice.duration * (this.duration === "long" ? 3 : 1);
  }

  private showNext(): void {
    if (this.disposed || this.suspended || this.current || !this.queue.length) return;
    this.current = this.queue.shift()!;
    this.origin = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    this.remaining = this.durationFor(this.current);
    this.message.textContent = this.current.message;
    this.action.hidden = !this.current.action;
    this.action.textContent = this.current.action?.label ?? "";
    this.bar.hidden = false;
    this.announcement.textContent = this.current.message;
    this.keepOriginVisible();
    this.schedule();
  }

  private keepOriginVisible(): void {
    if (!this.origin?.closest(".app-scroll")) return;
    this.origin.scrollIntoView?.({ block: "nearest", inline: "nearest" });
  }

  private dismiss(restoreFocus = true, advance = true): void {
    this.stop();
    const hadFocus = this.bar.contains(document.activeElement);
    this.current = undefined;
    this.bar.hidden = true;
    this.announcement.textContent = "";
    this.pauses.delete("focus");
    this.pauses.delete("hover");
    if (hadFocus && restoreFocus) this.restoreFocus();
    if (advance) this.showNext();
  }

  private restoreFocus(): void {
    const fallback = document.querySelector<HTMLElement>("#replay, #seed-button, #game");
    (this.origin?.isConnected ? this.origin : fallback)?.focus({ preventScroll: true });
  }
}

export function createSnackbar(host: HTMLElement): Snackbar {
  return new SnackbarController(host);
}
