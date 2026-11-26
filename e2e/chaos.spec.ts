import { expect, test } from "@playwright/test";

test("development chaos transport fails once, recovers locally, and never calls Budokon", async ({ page }) => {
  const liveRequests: string[] = [];
  const consoleMessages: string[] = [];
  page.on("request", request => {
    if (request.url().startsWith("https://budokon.scheimann.workers.dev/")) liveRequests.push(request.url());
  });
  page.on("console", message => consoleMessages.push(message.text()));

  await page.goto("/");
  await expect(page.getByRole("group", { name: "Choose game mode" })).toBeVisible();
  await expect.poll(() => consoleMessages.some(message => message.includes("fault profile '503-once' is active")))
    .toBe(true);

  const quickStart = page.getByRole("button", { name: "Quick start" });
  await quickStart.click();
  await expect(page.locator(".intro-status")).toContainText("temporarily unavailable (HTTP 503)");
  await quickStart.click();
  await expect(page.getByRole("heading", { name: "Choose a stat" })).toBeVisible();

  const diagnostics = await page.evaluate(() =>
    (window as Window & {
      judokonApiDiagnostics?: () => {
        attempts: number;
        successes: number;
        failures: number;
        lastOutcome: string | null;
        httpFailureStatusCounts: Record<string, number>;
      };
    }).judokonApiDiagnostics?.()
  );
  expect(diagnostics).toMatchObject({
    attempts: 2,
    successes: 1,
    failures: 1,
    lastOutcome: "success",
    httpFailureStatusCounts: { "503": 1 }
  });
  expect(liveRequests).toEqual([]);
});
