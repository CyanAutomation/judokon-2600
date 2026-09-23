import { expect, test } from "@playwright/test";

test("a player can complete setup with the documented keyboard shortcuts", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { name: /enter the judoka circuit/i })).toBeVisible();
  await page.keyboard.press("c");
  await expect(page.getByRole("group", { name: "Choose division" })).toBeVisible();

  await page.keyboard.press("a");
  await expect(page.getByRole("group", { name: "Choose match length" })).toBeVisible();

  await page.keyboard.press("1");
  await expect(page.getByRole("button", { name: /start match/i })).toBeVisible();
});
