import { afterEach, describe, expect, it, vi } from "vitest";
import { registerAppServiceWorker } from "./registerServiceWorker";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("service worker registration", () => {
  it("does not register outside production", async () => {
    vi.stubEnv("PROD", false);
    const register = vi.fn();
    vi.stubGlobal("navigator", { serviceWorker: { register } });

    await registerAppServiceWorker(vi.fn());

    expect(register).not.toHaveBeenCalled();
  });

  it("registers in production and reports an already waiting worker", async () => {
    vi.stubEnv("PROD", true);
    const waiting = { state: "installed" } as ServiceWorker;
    const registration = {
      waiting,
      installing: null,
      addEventListener: vi.fn()
    } as unknown as ServiceWorkerRegistration;
    const register = vi.fn().mockResolvedValue(registration);
    vi.stubGlobal("navigator", { serviceWorker: { register, controller: {} } });
    const onWaiting = vi.fn();

    await registerAppServiceWorker(onWaiting);

    expect(register).toHaveBeenCalledWith("/sw.js");
    expect(onWaiting).toHaveBeenCalledWith(waiting);
  });

  it("silently ignores a blocked registration", async () => {
    vi.stubEnv("PROD", true);
    vi.stubGlobal("navigator", { serviceWorker: { register: vi.fn().mockRejectedValue(new Error("blocked")) } });

    await expect(registerAppServiceWorker(vi.fn())).resolves.toBeUndefined();
  });
});
