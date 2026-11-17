import { describe, expect, it, vi } from "vitest";
import { createMockGameState } from "../test/mocks";
import { renderApp } from "../ui/render";
import { createInstallPromptController } from "./installPrompt";

describe("install affordance", () => {
  it("captures and triggers a Chromium prompt from a user action", async () => {
    const changes: Array<{ buttonAvailable: boolean; iosHintVisible: boolean }> = [];
    const controller = createInstallPromptController({
      userAgent: "Mozilla/5.0 Chrome/130.0.0.0 Safari/537.36",
      standalone: false
    }, presentation => changes.push(presentation));
    const source = new EventTarget();
    controller.attach(source);
    const prompt = vi.fn().mockResolvedValue(undefined);
    const beforeInstall = new Event("beforeinstallprompt", { cancelable: true }) as Event & {
      prompt: () => Promise<void>;
      userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
    };
    beforeInstall.prompt = prompt;
    beforeInstall.userChoice = Promise.resolve({ outcome: "accepted", platform: "web" });

    source.dispatchEvent(beforeInstall);
    expect(beforeInstall.defaultPrevented).toBe(true);
    expect(controller.getPresentation()).toEqual({ buttonAvailable: true, iosHintVisible: false });
    await controller.install();

    expect(prompt).toHaveBeenCalledOnce();
    expect(controller.getPresentation()).toEqual({ buttonAvailable: false, iosHintVisible: false });
    expect(changes.at(-1)).toEqual({ buttonAvailable: false, iosHintVisible: false });
    controller.dispose();
  });

  it("keeps the install prompt available when prompt() throws synchronously", async () => {
    const onChange = vi.fn();
    const controller = createInstallPromptController({ userAgent: "Chrome/130.0.0.0", standalone: false }, onChange);
    const source = new EventTarget();
    controller.attach(source);
    const prompt = vi.fn()
      .mockImplementationOnce(() => { throw new Error("Prompt unavailable"); })
      .mockResolvedValueOnce(undefined);
    const beforeInstall = new Event("beforeinstallprompt", { cancelable: true }) as Event & {
      prompt: () => Promise<void>;
      userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
    };
    beforeInstall.prompt = prompt;
    beforeInstall.userChoice = Promise.resolve({ outcome: "accepted", platform: "web" });
    source.dispatchEvent(beforeInstall);

    await controller.install();
    expect(controller.getPresentation()).toEqual({ buttonAvailable: true, iosHintVisible: false });

    await controller.install();
    expect(prompt).toHaveBeenCalledTimes(2);
    expect(controller.getPresentation()).toEqual({ buttonAvailable: false, iosHintVisible: false });
    controller.dispose();
  });

  it("shows the Home Screen hint on iOS Safari and hides it in standalone mode", () => {
    const iosSafari = "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) Version/18.0 Mobile/15E148 Safari/604.1";
    const safari = createInstallPromptController({ userAgent: iosSafari, standalone: false }, vi.fn());
    const installed = createInstallPromptController({ userAgent: iosSafari, standalone: true }, vi.fn());
    const ipadSafari = createInstallPromptController({
      userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15) Version/18.0 Safari/605.1",
      platform: "MacIntel",
      maxTouchPoints: 5,
      standalone: false
    }, vi.fn());

    expect(safari.getPresentation()).toEqual({ buttonAvailable: false, iosHintVisible: true });
    expect(ipadSafari.getPresentation()).toEqual({ buttonAvailable: false, iosHintVisible: true });
    expect(installed.getPresentation()).toEqual({ buttonAvailable: false, iosHintVisible: false });
  });

  it("hides the install button after the appinstalled event", () => {
    const controller = createInstallPromptController({ userAgent: "Chrome/130.0.0.0", standalone: false }, vi.fn());
    const source = new EventTarget();
    controller.attach(source);
    const beforeInstall = new Event("beforeinstallprompt", { cancelable: true }) as Event & {
      prompt: () => Promise<void>;
      userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
    };
    beforeInstall.prompt = vi.fn().mockResolvedValue(undefined);
    beforeInstall.userChoice = Promise.resolve({ outcome: "accepted", platform: "web" });
    source.dispatchEvent(beforeInstall);
    expect(controller.getPresentation().buttonAvailable).toBe(true);

    source.dispatchEvent(new Event("appinstalled"));

    expect(controller.getPresentation()).toEqual({ buttonAvailable: false, iosHintVisible: false });
    controller.dispose();
  });

  it("renders the available install choice inside Game settings", () => {
    const root = document.createElement("div");
    renderApp(root, createMockGameState({ installPromptAvailable: true }));
    const settings = root.querySelector<HTMLDetailsElement>(".footer-settings");
    settings!.open = true;

    expect(root.querySelector<HTMLButtonElement>("#install-app")?.textContent).toContain("Install app");
    expect(root.querySelector(".install-hint")).toBeNull();

    renderApp(root, createMockGameState({ iosInstallHint: true }));
    expect(root.querySelector(".install-hint")?.textContent).toBe("Share, then Add to Home Screen");
    expect(root.querySelector("#install-app")).toBeNull();
  });
});
