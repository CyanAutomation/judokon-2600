import { expect, test } from "@playwright/test";
import { mockBudokonDraw } from "./support/budokon";

test("[REQ-UI-022] player can reach stat choices that fit at mobile and desktop widths", async ({ page }) => {
  await mockBudokonDraw(page);

  await page.goto("/");
  await expect(page.getByRole("group", { name: "Choose game mode" })).toBeVisible();

  await page.getByText("Classic Battle", { exact: true }).click();
  await page.getByText("Absolute", { exact: true }).click();
  await page.getByText("Quick", { exact: true }).click();

  await expect(page.getByRole("heading", { name: "Choose a stat" })).toBeVisible();
  await expect(page.locator('[data-stat="power"]')).toBeVisible();

  for (const width of [360, 560, 700, 900, 980, 1280, 1600]) {
    await page.setViewportSize({ width, height: 720 });
    const overflowingChoices = await page.locator(".stats .option-card").evaluateAll((buttons) =>
      buttons
        .filter((button) => button.scrollWidth > button.clientWidth + 1)
        .map((button) => button.textContent?.trim())
    );
    expect(overflowingChoices, `stat choice text should fit at ${width}px`).toEqual([]);
  }
});

test("[REQ-UI-003] round result keeps the comparison and next action in view on desktop and mobile", async ({ page }) => {
  await mockBudokonDraw(page);
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto("/");
  await page.getByText("Classic Battle", { exact: true }).click();
  await page.getByText("Absolute", { exact: true }).click();
  await page.getByText("Quick", { exact: true }).click();

  await page.locator('[data-stat="power"]').click();
  await expect(page.locator("#next")).toBeVisible();
  await expect(page.locator(".head-to-head")).toBeVisible();
  await expect.poll(() => page.evaluate(() => (document.activeElement as HTMLElement | null)?.id)).toBe("next");

  const appScroll = page.locator(".app-scroll");
  await expect(appScroll).toHaveCount(1);
  const desktopAction = await page.locator("#next").evaluate((button) => {
    const rect = button.getBoundingClientRect();
    return { top: rect.top, bottom: rect.bottom };
  });
  const desktopScrollTop = await appScroll.evaluate((element) => element.scrollTop);
  expect(desktopAction.top).toBeGreaterThanOrEqual(0);
  expect(desktopAction.bottom).toBeLessThanOrEqual(720);
  expect(desktopScrollTop).toBe(0);

  await page.locator("#next").click();
  await page.setViewportSize({ width: 360, height: 720 });
  await page.locator('[data-stat="speed"]').click();
  await expect(page.locator("#next")).toBeVisible();
  await expect(page.locator(".head-to-head")).toBeVisible();

  await expect(appScroll).toHaveCount(1);
  const mobileAction = await page.locator("#next").evaluate((button) => {
    const rect = button.getBoundingClientRect();
    return { top: rect.top, bottom: rect.bottom };
  });
  const mobileScrollTop = await appScroll.evaluate((element) => element.scrollTop);
  expect(mobileAction.top).toBeGreaterThanOrEqual(0);
  expect(mobileAction.bottom).toBeLessThanOrEqual(720);
  expect(mobileScrollTop).toBe(0);
});

test("[REQ-GAME-023] summary and Quit keys keep native actions; Undo restores the match", async ({ page }) => {
  await mockBudokonDraw(page);
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto("/");
  await page.getByText("Classic Battle", { exact: true }).click();
  await page.getByText("Absolute", { exact: true }).click();
  await page.getByText("Quick", { exact: true }).click();
  await page.locator('[data-stat="power"]').click();

  const history = page.locator("details.match-history");
  await history.locator("summary").focus();
  await page.keyboard.press("Enter");
  await expect(history).toHaveAttribute("open", "");
  await expect(page.locator("#next")).toBeVisible();

  await page.locator("#quit").focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("button", { name: "Undo quit" })).toBeVisible();
  await expect(page.getByRole("group", { name: "Choose game mode" })).toBeVisible();
  await page.screenshot({ path: "docs/assets/review/quit-undo-desktop.png", fullPage: true });

  await page.setViewportSize({ width: 360, height: 720 });
  await page.screenshot({ path: "docs/assets/review/quit-undo-mobile.png", fullPage: true });
  await page.getByRole("button", { name: "Undo quit" }).click();
  await expect(page.locator(".result-panel")).toBeVisible();
  await expect(page.locator("#next")).toBeVisible();
});

test("[REQ-UI-025] Quick start opens the default match and its glossary and history are useful", async ({ page }) => {
  await mockBudokonDraw(page);
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto("/");
  await expect(page.getByRole("group", { name: "Choose game mode" })).toBeVisible();
  await expect(page.locator("#intro-title")).toHaveText("Step into the judoka circuit.");
  await expect(page.locator("#intro-title br")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Quick start" })).toBeVisible();
  await page.screenshot({ path: "docs/assets/review/quick-start-desktop.png", fullPage: true });

  await page.setViewportSize({ width: 360, height: 720 });
  await page.screenshot({ path: "docs/assets/review/quick-start-mobile.png", fullPage: true });
  const drawResponse = page.waitForResponse(response =>
    response.url() === "https://budokon.scheimann.workers.dev/v1/draw" && response.request().method() === "POST"
  );
  await page.getByRole("button", { name: "Quick start" }).click();
  await expect(page.getByRole("heading", { name: "Choose a stat" })).toBeVisible();
  const { judoka: drawn } = await (await drawResponse).json() as {
    judoka: { firstname: string; surname: string; stats: Record<string, number> }[];
  };
  const [firstPlayer, firstOpponent, secondPlayer, secondOpponent] = drawn;
  await expect(page.locator(".scoreboard")).toContainText("First to 3");
  const sound = page.locator("#sound-enabled");
  await expect(sound).toHaveAttribute("aria-pressed", "false");
  await sound.focus();
  await page.keyboard.press("Enter");
  await expect(page.locator("#sound-enabled")).toHaveAttribute("aria-pressed", "true");
  await page.keyboard.press("Space");
  await expect(page.locator("#sound-enabled")).toHaveAttribute("aria-pressed", "false");

  const glossary = page.locator("details.stat-glossary");
  await glossary.locator("summary").click();
  await expect(glossary).toContainText("Grip fighting");
  await expect(glossary).toContainText("Ground work");

  await page.locator('[data-stat="power"]').click();
  const history = page.locator("details.match-history");
  await history.locator("summary").click();
  const row = history.locator("li").first();
  await expect(row).toContainText(`${firstOpponent!.firstname} ${firstOpponent!.surname}`);
  await expect(row).toContainText(`You ${firstPlayer!.stats.power} · Opponent ${firstOpponent!.stats.power}`);

  await page.setViewportSize({ width: 1280, height: 720 });
  await row.scrollIntoViewIfNeeded();
  await page.screenshot({ path: "docs/assets/review/round-history-desktop.png" });

  await page.locator("#next").click();
  await page.locator('[data-stat="speed"]').click();
  await page.setViewportSize({ width: 360, height: 720 });
  const updatedHistory = page.locator("details.match-history");
  await updatedHistory.locator("summary").click();
  await expect(updatedHistory).toHaveAttribute("open", "");
  const secondRow = updatedHistory.locator("li").nth(1);
  await expect(secondRow).toContainText(`${secondOpponent!.firstname} ${secondOpponent!.surname}`);
  await expect(secondRow).toContainText(`You ${secondPlayer!.stats.speed} · Opponent ${secondOpponent!.stats.speed}`);
  await expect(secondRow).toContainText("DRAW");
  const scrollWidth = await updatedHistory.locator("ol").evaluate(element => element.scrollWidth);
  const clientWidth = await updatedHistory.locator("ol").evaluate(element => element.clientWidth);
  expect(scrollWidth).toBeGreaterThan(clientWidth);
  await updatedHistory.locator("ol").evaluate(element => { element.scrollLeft = element.scrollWidth; });
  const scrollLeft = await updatedHistory.locator("ol").evaluate(element => element.scrollLeft);
  expect(scrollLeft).toBeGreaterThan(0);
});

test("[REQ-PWA-029] production registers the service worker and keeps the app shell available offline", async ({ page, context }) => {
  await page.goto("/");
  await expect(page.getByRole("group", { name: "Choose game mode" })).toBeVisible();
  await expect.poll(() => page.evaluate(async () => {
    const registration = await navigator.serviceWorker.ready;
    return registration.active?.state;
  })).toBe("activated");
  await page.reload();
  await expect.poll(() => page.evaluate(() => Boolean(navigator.serviceWorker.controller))).toBe(true);

  await context.setOffline(true);
  await page.reload();
  await expect(page.getByRole("group", { name: "Choose game mode" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Quick start" })).toBeVisible();
  await page.getByText("Game settings", { exact: true }).click();
  const notificationDuration = page.getByLabel("Notification duration");
  await expect(notificationDuration).toBeVisible();
  await notificationDuration.selectOption("long");
  await expect(notificationDuration).toHaveValue("long");

  await context.setOffline(false);
  for (const path of [
    "/site.webmanifest",
    "/favicon.svg",
    "/icon-192.png",
    "/icon-512.png",
    "/icon-512-maskable.png",
    "/apple-touch-icon.png"
  ]) {
    const response = await page.request.get(new URL(path, page.url()).toString());
    expect(response.status(), `${path} should be served`).toBe(200);
  }
});

test("[REQ-UI-030] an offline match draw explains how to reconnect and can be retried", async ({ page, context }) => {
  let catalogueAvailable = false;
  await mockBudokonDraw(page, { shouldAbort: () => !catalogueAvailable });

  await page.goto("/");
  await expect(page.getByRole("group", { name: "Choose game mode" })).toBeVisible();
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.reload();
  await expect.poll(() => page.evaluate(() => Boolean(navigator.serviceWorker.controller))).toBe(true);

  await context.setOffline(true);
  await page.getByRole("button", { name: "Quick start" }).click();
  await expect(page.locator(".intro-status")).toContainText("You're offline. Reconnect to start a match.");
  await expect(page.locator("[data-game-status]")).toHaveAttribute("aria-live", "polite");
  await expect(page.locator("[data-game-status]")).toHaveText(">> You're offline. Reconnect to start a match.");

  catalogueAvailable = true;
  await context.setOffline(false);
  await expect(page.locator(".intro-status")).toContainText("You're back online. You can retry your match.");
  await expect(page.locator("[data-game-status]")).toHaveText(">> You're back online. You can retry your match.");
  await page.getByRole("button", { name: "Quick start" }).click();
  await expect(page.getByRole("heading", { name: "Choose a stat" })).toBeVisible();
});

test("a temporary Budokon outage lets Quick Start succeed on retry", async ({ page }) => {
  await mockBudokonDraw(page, {
    scenarios: [{ kind: "response", status: 503, body: "temporarily unavailable" }]
  });
  await page.goto("/");

  const quickStart = page.getByRole("button", { name: "Quick start" });
  await quickStart.click();
  await expect(page.locator(".intro-status")).toContainText("temporarily unavailable (HTTP 503)");
  await expect(quickStart).toBeEnabled();

  await quickStart.click();
  await expect(page.getByRole("heading", { name: "Choose a stat" })).toBeVisible();
});

test("a delayed Budokon response keeps setup responsive without duplicating the draw", async ({ page }) => {
  let drawRequests = 0;
  page.on("request", request => {
    if (request.url() === "https://budokon.scheimann.workers.dev/v1/draw" && request.method() === "POST") {
      drawRequests += 1;
    }
  });
  await mockBudokonDraw(page, { scenarios: [{ kind: "delay", delayMs: 250 }] });
  await page.goto("/");

  const quickStart = page.getByRole("button", { name: "Quick start" });
  await quickStart.click();
  await expect(page.locator(".intro-status")).toContainText("Putting your matchup together");
  await quickStart.click();
  await expect(page.getByRole("heading", { name: "Choose a stat" })).toBeVisible();

  expect(drawRequests).toBe(1);
});

test("a malformed successful Budokon response does not poison a retry", async ({ page }) => {
  await mockBudokonDraw(page, {
    scenarios: [{ kind: "response", status: 200, body: "{ malformed response" }]
  });
  await page.goto("/");

  const quickStart = page.getByRole("button", { name: "Quick start" });
  await quickStart.click();
  await expect(page.locator(".intro-status")).toContainText("Budokon API returned an invalid response");

  await quickStart.click();
  await expect(page.getByRole("heading", { name: "Choose a stat" })).toBeVisible();
});

test("a failed buffer refill preserves the match and recovers on the next-round retry", async ({ page }) => {
  await mockBudokonDraw(page, {
    scenarios: [
      null,
      { kind: "response", status: 503, body: "temporarily unavailable" }
    ]
  });
  await page.goto("/");
  await page.getByText("Classic Battle", { exact: true }).click();
  await page.getByText("Absolute", { exact: true }).click();
  await page.getByText("Long", { exact: true }).click();
  await expect(page.getByRole("heading", { name: "Choose a stat" })).toBeVisible();

  for (let round = 0; round < 3; round += 1) {
    await page.locator('[data-stat="power"]').click();
    await expect(page.locator("#next")).toBeVisible();
    if (round < 2) {
      await page.locator("#next").click();
    }
  }

  const previousScore = await page.locator(".scoreboard").getAttribute("aria-label");
  const retryResponse = page.waitForResponse(response =>
    response.url() === "https://budokon.scheimann.workers.dev/v1/draw" && response.request().method() === "POST"
  );
  await page.locator("#next").click();
  await expect(page.locator("#status")).toContainText("temporarily unavailable (HTTP 503)");
  await expect(page.locator(".scoreboard")).toHaveAttribute("aria-label", previousScore!);
  await expect(page.locator("#next")).toBeEnabled();

  const recoveryResponse = page.waitForResponse(response =>
    response.url() === "https://budokon.scheimann.workers.dev/v1/draw" && response.request().method() === "POST"
  );
  await page.locator("#next").click();
  await Promise.all([retryResponse, recoveryResponse]);
  await expect(page.locator("[data-game-status]")).not.toContainText("temporarily unavailable");
  await expect(page.locator(".battle-layout")).toHaveAttribute("data-phase", "selecting");
});

test("[REQ-PWA-032] Game settings trigger the available install prompt by keyboard", async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => {
    Object.assign(window, { pwaPromptCalled: false });
    const event = new Event("beforeinstallprompt", { cancelable: true }) as Event & {
      prompt: () => Promise<void>;
      userChoice: Promise<{ outcome: "accepted"; platform: string }>;
    };
    event.prompt = async () => {
      (window as typeof window & { pwaPromptCalled: boolean }).pwaPromptCalled = true;
    };
    event.userChoice = Promise.resolve({ outcome: "accepted", platform: "web" });
    window.dispatchEvent(event);
  });

  await page.getByText("Game settings", { exact: true }).click();
  const installButton = page.getByRole("button", { name: "Install app" });
  await expect(installButton).toBeVisible();
  await installButton.focus();
  await page.keyboard.press("Enter");

  await expect.poll(() => page.evaluate(() => (window as typeof window & { pwaPromptCalled: boolean }).pwaPromptCalled)).toBe(true);
  await expect(page.getByRole("button", { name: "Install app" })).toHaveCount(0);
  await expect.poll(() => page.locator(".footer-settings > summary").evaluate(summary => document.activeElement === summary)).toBe(true);
});
