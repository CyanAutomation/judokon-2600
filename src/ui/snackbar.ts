/** Transient UI feedback. Timers and DOM updates never render or persist a match. */
export interface Notice {
  key: string;
  message: string;
  duration: number;
  action?: { label: string; run: () => void };
}
export type NoticeDuration = "normal" | "long" | "manual";
const DURATION_KEY = "judokon.noticeDuration";

export function getNoticeDuration(): NoticeDuration {
  try {
    const value = localStorage.getItem(DURATION_KEY);
    return value === "long" || value === "manual" ? value : "normal";
  } catch { return "normal"; }
}

export function createSnackbar(host: HTMLElement) {
  host.classList.add("notification-dock");
  host.innerHTML = '<div class="snackbar" role="group" aria-label="Notification" hidden><p class="snackbar-message"></p><button type="button" class="control control--quiet quiet" data-action hidden></button><button type="button" class="control control--quiet quiet" data-dismiss aria-label="Dismiss notification">Dismiss</button></div><span class="visually-hidden" role="status" aria-live="polite" aria-atomic="true"></span>';
  const bar = host.querySelector<HTMLElement>(".snackbar")!;
  const message = host.querySelector<HTMLElement>(".snackbar-message")!;
  const announcement = host.querySelector<HTMLElement>('[role="status"]')!;
  const action = host.querySelector<HTMLButtonElement>("[data-action]")!;
  const dismissButton = host.querySelector<HTMLButtonElement>("[data-dismiss]")!;
  const abort = new AbortController();
  const listenerOptions = { signal: abort.signal };
  let current: Notice | undefined;
  let queue: Notice[] = [];
  let timer: ReturnType<typeof setTimeout> | undefined;
  let started = 0;
  let remaining = 0;
  let origin: HTMLElement | null = null;
  let suspended = false;
  let disposed = false;
  let duration = getNoticeDuration();
  const pauses = new Set<string>();
  if (document.hidden) pauses.add("hidden");

  function stop() {
    if (timer !== undefined) {
      clearTimeout(timer);
      timer = undefined;
      remaining = Math.max(0, remaining - (Date.now() - started));
    }
  }
  function schedule() {
    stop();
    if (!current || suspended || pauses.size || duration === "manual") return;
    started = Date.now();
    timer = setTimeout(() => dismiss(), remaining);
  }
  function pause(reason: string, value: boolean) {
    stop();
    if (value) pauses.add(reason);
    else pauses.delete(reason);
    schedule();
  }
  function showNext() {
    if (disposed || suspended || current || !queue.length) return;
    current = queue.shift()!;
    origin = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    remaining = current.duration * (duration === "long" ? 3 : 1);
    message.textContent = current.message;
    action.hidden = !current.action;
    action.textContent = current.action?.label ?? "";
    bar.hidden = false;
    announcement.textContent = current.message;
    if (origin?.closest(".app-scroll")) origin.scrollIntoView?.({ block: "nearest", inline: "nearest" });
    schedule();
  }
  function dismiss(restoreFocus = true, advance = true) {
    stop();
    const hadFocus = bar.contains(document.activeElement);
    current = undefined;
    bar.hidden = true;
    announcement.textContent = "";
    pauses.delete("focus");
    pauses.delete("hover");
    if (hadFocus && restoreFocus) {
      const fallback = document.querySelector<HTMLElement>("#replay, #seed-button, #game");
      (origin?.isConnected ? origin : fallback)?.focus({ preventScroll: true });
    }
    if (advance) showNext();
  }
  bar.addEventListener("pointerenter", () => pause("hover", true), listenerOptions);
  bar.addEventListener("pointerleave", () => pause("hover", false), listenerOptions);
  bar.addEventListener("focusin", () => pause("focus", true), listenerOptions);
  bar.addEventListener("focusout", (event) => {
    if (!(event.relatedTarget instanceof Node) || !bar.contains(event.relatedTarget)) pause("focus", false);
  }, listenerOptions);
  bar.addEventListener("keydown", (event) => {
    // Native button activation still works; gameplay shortcuts never receive these keys.
    event.stopPropagation();
    if (event.key === "Escape") { event.preventDefault(); dismiss(); }
  }, listenerOptions);
  dismissButton.addEventListener("click", () => dismiss(), listenerOptions);
  action.addEventListener("click", () => {
    const run = current?.action?.run;
    dismiss(false, false);
    run?.();
    showNext();
  }, listenerOptions);
  document.addEventListener("visibilitychange", () => pause("hidden", document.hidden), listenerOptions);

  return {
    show(notice: Notice) {
      if (disposed) return;
      const replacingCurrent = current?.key === notice.key;
      if (replacingCurrent) {
        if (current?.message === notice.message) return;
        dismiss(true, false);
        queue.unshift(notice);
      } else {
        const index = queue.findIndex(item => item.key === notice.key);
        if (index >= 0) queue[index] = notice;
        else queue.push(notice);
      }
      showNext();
      if (queue.length > 2) {
        // A suspended replacement stays first; ordinary overflow drops the oldest pending notice.
        if (replacingCurrent) queue.pop();
        else queue.shift();
      }
    },
    clear() { queue = []; dismiss(); },
    setSuspended(value: boolean) {
      if (suspended === value) return;
      stop();
      suspended = value;
      bar.hidden = suspended || !current;
      if (!suspended) { showNext(); schedule(); }
    },
    setDuration(value: NoticeDuration) {
      duration = value;
      try { localStorage.setItem(DURATION_KEY, value); } catch { /* Session preference still works. */ }
      stop();
      if (current) remaining = current.duration * (value === "long" ? 3 : 1);
      schedule();
    },
    dispose() { disposed = true; queue = []; dismiss(); abort.abort(); }
  };
}
