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

test("player can complete setup and reach the first stat choice", async ({ page }) => {
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

  await page.goto("/");
  await expect(page.getByRole("group", { name: "Choose game mode" })).toBeVisible();

  await page.getByText("Classic Battle", { exact: true }).click();
  await page.getByText("Absolute", { exact: true }).click();
  await page.getByText("Quick", { exact: true }).click();

  await expect(page.getByRole("heading", { name: "Choose a stat" })).toBeVisible();
  await expect(page.locator('[data-stat="power"]')).toBeVisible();
});
