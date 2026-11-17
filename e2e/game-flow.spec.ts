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
