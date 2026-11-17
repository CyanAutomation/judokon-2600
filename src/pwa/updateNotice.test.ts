import { describe, expect, it, vi } from "vitest";
import { createMockMatch } from "../test/mocks";
import { createUpdateNoticeCoordinator } from "./updateNotice";

describe("service worker update notice", () => {
  it("defers until setup or a completed match and activates only after Reload is chosen", () => {
    const serviceWorker = new EventTarget();
    const notices: Array<{ key: string; message: string; duration: number; action?: { label: string; run: () => void } }> = [];
    const reload = vi.fn();
    const update = createUpdateNoticeCoordinator(notice => notices.push(notice), serviceWorker, reload);
    const worker = { postMessage: vi.fn() } as unknown as ServiceWorker;

    update.setMatch(createMockMatch({ phase: "selecting" }));
    update.setWaitingWorker(worker);
    expect(notices).toHaveLength(0);

    update.setMatch(createMockMatch({ phase: "awaitingNext" }));
    expect(notices).toHaveLength(0);

    update.setMatch(createMockMatch({ phase: "matchOver" }));
    expect(notices).toHaveLength(1);
    expect(notices[0]).toMatchObject({
      key: "app-update",
      message: "A new version is available.",
      action: { label: "Reload" }
    });
    expect(worker.postMessage).not.toHaveBeenCalled();

    notices[0]!.action!.run();
    expect(worker.postMessage).toHaveBeenCalledWith({ type: "SKIP_WAITING" });
    expect(reload).not.toHaveBeenCalled();
    serviceWorker.dispatchEvent(new Event("controllerchange"));
    serviceWorker.dispatchEvent(new Event("controllerchange"));
    expect(reload).toHaveBeenCalledOnce();
  });

  it("shows a waiting update on the setup screen and does not repeat it on rerender", () => {
    const notices: unknown[] = [];
    const update = createUpdateNoticeCoordinator(notice => notices.push(notice), new EventTarget(), vi.fn());

    update.setWaitingWorker({ postMessage: vi.fn() } as unknown as ServiceWorker);
    update.setMatch(null);
    update.setMatch(null);

    expect(notices).toHaveLength(1);
  });
});
