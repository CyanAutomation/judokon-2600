export interface InstallPresentation {
  buttonAvailable: boolean;
  iosHintVisible: boolean;
}

interface InstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

interface InstallEnvironment {
  userAgent: string;
  standalone: boolean;
  platform?: string;
  maxTouchPoints?: number;
}

function isIosSafari(environment: InstallEnvironment): boolean {
  const isIos = /iPhone|iPad|iPod/i.test(environment.userAgent) ||
    ((/Macintosh/i.test(environment.userAgent) || environment.platform === "MacIntel") && (environment.maxTouchPoints ?? 0) > 1);
  const isSafari = /Safari/i.test(environment.userAgent) && !/CriOS|FxiOS|EdgiOS|OPiOS/i.test(environment.userAgent);
  return isIos && isSafari;
}

export function isStandaloneApp(): boolean {
  const navigatorWithStandalone = navigator as Navigator & { standalone?: boolean };
  return window.matchMedia?.("(display-mode: standalone)").matches === true || navigatorWithStandalone.standalone === true;
}

/** Keep Chromium's one-shot install event until an explicit user click. */
export function createInstallPromptController(
  environment: InstallEnvironment,
  onChange: (presentation: InstallPresentation) => void
) {
  let installed = environment.standalone;
  let promptEvent: InstallPromptEvent | null = null;
  let source: EventTarget | null = null;

  const getPresentation = (): InstallPresentation => ({
    buttonAvailable: !installed && Boolean(promptEvent),
    iosHintVisible: !installed && !promptEvent && isIosSafari(environment)
  });

  const handleBeforeInstallPrompt = (event: Event): void => {
    event.preventDefault();
    if (installed) return;
    promptEvent = event as InstallPromptEvent;
    onChange(getPresentation());
  };

  const handleAppInstalled = (): void => {
    installed = true;
    promptEvent = null;
    onChange(getPresentation());
  };

  return {
    getPresentation,
    attach(target: EventTarget): void {
      if (source) return;
      source = target;
      source.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      source.addEventListener("appinstalled", handleAppInstalled);
    },
    async install(): Promise<void> {
      if (installed || !promptEvent) return;
      const event = promptEvent;
      promptEvent = null;
      let promptResult: Promise<void>;
      try {
        promptResult = event.prompt();
      } catch {
        promptEvent = event;
        onChange(getPresentation());
        return;
      }
      onChange(getPresentation());
      try {
        await promptResult;
        await event.userChoice;
      } catch {
        // The browser owns the prompt and may reject it if its install state changes.
      }
    },
    dispose(): void {
      source?.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      source?.removeEventListener("appinstalled", handleAppInstalled);
      source = null;
    }
  };
}
