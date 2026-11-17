export type WaitingWorkerHandler = (worker: ServiceWorker) => void;

/** Register the production service worker and surface workers waiting for an update. */
export async function registerAppServiceWorker(onWaiting: WaitingWorkerHandler): Promise<void> {
  if (!import.meta.env.PROD || typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;

  const serviceWorker = navigator.serviceWorker;
  try {
    const registration = await serviceWorker.register("/sw.js");
    const notifyWaitingWorker = (): void => {
      if (registration.waiting) onWaiting(registration.waiting);
    };

    registration.addEventListener("updatefound", () => {
      const installing = registration.installing;
      if (!installing) return;
      installing.addEventListener("statechange", () => {
        if (installing.state === "installed" && serviceWorker.controller) notifyWaitingWorker();
      });
    });

    notifyWaitingWorker();
  } catch {
    // Offline, blocked, and unsupported registration must not affect gameplay.
  }
}
