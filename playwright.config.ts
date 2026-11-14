import { defineConfig, devices } from "@playwright/test";
import { env } from "node:process";

export default defineConfig({
  testDir: "./e2e",
  timeout: 20_000,
  expect: { timeout: 5_000 },
  fullyParallel: true,
  reporter: [
    ["list"],
    ["html", { outputFolder: "playwright-report", open: "never" }]
  ],
  use: {
    baseURL: "http://127.0.0.1:5173",
    launchOptions: env.PLAYWRIGHT_CHROMIUM_EXECUTABLE
      ? { executablePath: env.PLAYWRIGHT_CHROMIUM_EXECUTABLE }
      : undefined,
    trace: "retain-on-failure",
    screenshot: "only-on-failure"
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] }
    }
  ],
  webServer: {
    command: "npm run dev -- --host 127.0.0.1",
    url: "http://127.0.0.1:5173",
    reuseExistingServer: !env.CI,
    timeout: 30_000
  }
});
