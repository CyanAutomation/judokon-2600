import type { Match } from "../game/game";
import type { Notice } from "../ui/noticeTypes";

type MatchStatus = Pick<Match, "phase"> | null;
type WaitingWorker = Pick<ServiceWorker, "postMessage">;

/** Matches are ephemeral, so never offer a reload while a round can still progress. */
export function canShowUpdateNotice(match: MatchStatus): boolean {
  return !match || match.phase === "matchOver";
}

/** Coordinate the waiting-worker prompt with match state and the controlling worker. */
export function createUpdateNoticeCoordinator(
  notify: (notice: Notice) => void,
  serviceWorker: EventTarget,
  reload: () => void
) {
  let match: MatchStatus = null;
  let waitingWorker: WaitingWorker | null = null;
  let noticeShown = false;
  let reloadRequested = false;
  let reloadStarted = false;

  const onControllerChange = (): void => {
    if (!reloadRequested || reloadStarted) return;
    reloadStarted = true;
    reload();
  };
  serviceWorker.addEventListener("controllerchange", onControllerChange);

  const showIfSafe = (): void => {
    if (!waitingWorker || noticeShown || !canShowUpdateNotice(match)) return;
    noticeShown = true;
    notify({
      key: "app-update",
      message: "A new version is available.",
      duration: 8000,
      action: {
        label: "Reload",
        run: () => {
          if (!waitingWorker || reloadRequested) return;
          reloadRequested = true;
          waitingWorker.postMessage({ type: "SKIP_WAITING" });
        }
      }
    });
  };

  return {
    setMatch(nextMatch: MatchStatus): void {
      match = nextMatch;
      showIfSafe();
    },
    setWaitingWorker(worker: WaitingWorker): void {
      if (waitingWorker === worker) return;
      waitingWorker = worker;
      noticeShown = false;
      reloadRequested = false;
      reloadStarted = false;
      showIfSafe();
    },
    dispose(): void {
      serviceWorker.removeEventListener("controllerchange", onControllerChange);
    }
  };
}
