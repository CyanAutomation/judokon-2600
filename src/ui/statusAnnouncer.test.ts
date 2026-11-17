import { expect, it, vi } from "vitest";
import { createStatusAnnouncer } from "./statusAnnouncer";

it("[REQ-UI-024] announces a changed round result once, even when its UI rerenders", () => {
  const announce = vi.fn();
  const statusChanged = createStatusAnnouncer(announce, ">> Pick one of your stats.");
  const result = ">> You take the point: Power 8–5.";

  statusChanged(result);
  statusChanged(result);
  statusChanged(result);

  expect(announce).toHaveBeenCalledOnce();
  expect(announce).toHaveBeenCalledWith(result);
});
