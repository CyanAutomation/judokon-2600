import { expect, test } from "@playwright/test";

test("simulator mode starts Quick Start without requesting the live Budokon endpoint", async ({ page }) => {
  const browserRequests: string[] = [];
  const consoleMessages: string[] = [];
  page.on("request", request => {
    if (request.url().startsWith("https://budokon.scheimann.workers.dev/")) browserRequests.push(request.url());
  });
  page.on("console", message => consoleMessages.push(message.text()));

  await page.goto("/");
  await expect(page.getByRole("group", { name: "Choose game mode" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Quick start" })).toBeVisible();
  await page.getByRole("button", { name: "Quick start" }).click();

  await expect(page.getByRole("heading", { name: "Choose a stat" })).toBeVisible();
  expect(browserRequests).toEqual([]);
  expect(consoleMessages.some(message => message.includes("Simulated Budokon draw data is active"))).toBe(true);
});
