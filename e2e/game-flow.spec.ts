import { expect, test } from "@playwright/test";

const judoka = Array.from({ length: 6 }, (_, index) => ({
  id: `test-${index + 1}`,
  slug: `test-${index + 1}`,
  firstname: `Test${index + 1}`,
  surname: "Fighter",
  country: "Japan",
  countryCode: "JP",
  weightClass: "-73",
  stats: { power: 80 - index, speed: 70, technique: 60, kumikata: 50, newaza: 40 }
}));

async function mockCatalogue(page: import("@playwright/test").Page): Promise<void> {
  await page.route("https://budokon.scheimann.workers.dev/v1/draw", async (route) => {
    const corsHeaders = {
      "access-control-allow-origin": "*",
      "access-control-allow-methods": "POST, OPTIONS",
      "access-control-allow-headers": "content-type"
    };

    if (route.request().method() === "OPTIONS") {
      await route.fulfill({ status: 204, headers: corsHeaders });
      return;
    }

    await route.fulfill({
      status: 200,
      headers: { ...corsHeaders, "content-type": "application/json" },
      body: JSON.stringify({ judoka })
    });
  });
}

test("[REQ-UI-022] player can reach stat choices that fit at mobile and desktop widths", async ({ page }) => {
  await mockCatalogue(page);

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
  await mockCatalogue(page);
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
  await mockCatalogue(page);
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
  await mockCatalogue(page);
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto("/");
  await expect(page.getByRole("group", { name: "Choose game mode" })).toBeVisible();
  await expect(page.locator("#intro-title")).toHaveText("Step into the judoka circuit.");
  await expect(page.locator("#intro-title br")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Quick start" })).toBeVisible();
  await page.screenshot({ path: "docs/assets/review/quick-start-desktop.png", fullPage: true });

  await page.setViewportSize({ width: 360, height: 720 });
  await page.screenshot({ path: "docs/assets/review/quick-start-mobile.png", fullPage: true });
  await page.getByRole("button", { name: "Quick start" }).click();
  await expect(page.getByRole("heading", { name: "Choose a stat" })).toBeVisible();
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
  await expect(row).toContainText("Test2 Fighter");
  await expect(row).toContainText("You 80 · Opponent 79");

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
  await expect(secondRow).toContainText("Test4 Fighter");
  await expect(secondRow).toContainText("You 70 · Opponent 70");
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
  await page.route("https://budokon.scheimann.workers.dev/v1/draw", async route => {
    if (!catalogueAvailable) {
      await route.abort();
      return;
    }

    const corsHeaders = {
      "access-control-allow-origin": "*",
      "access-control-allow-methods": "POST, OPTIONS",
      "access-control-allow-headers": "content-type"
    };
    if (route.request().method() === "OPTIONS") {
      await route.fulfill({ status: 204, headers: corsHeaders });
      return;
    }
    await route.fulfill({
      status: 200,
      headers: { ...corsHeaders, "content-type": "application/json" },
      body: JSON.stringify({ judoka })
    });
  });

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
