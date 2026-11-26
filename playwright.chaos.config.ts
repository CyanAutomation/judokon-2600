import { defineConfig, devices } from "@playwright/test";
import { env } from "node:process";

export default defineConfig({
  testDir: "./e2e",
  testMatch: "chaos.spec.ts",
  timeout: 20_000,
  expect: { timeout: 5_000 },
  reporter: [["list"]],
  use: {
    baseURL: "http://127.0.0.1:4175",
    ...devices["Desktop Chrome"],
    launchOptions: env.PLAYWRIGHT_CHROMIUM_EXECUTABLE
      ? { executablePath: env.PLAYWRIGHT_CHROMIUM_EXECUTABLE }
      : undefined,
    trace: "retain-on-failure",
    screenshot: "only-on-failure"
  },
  webServer: {
    command: "npm run dev:chaos -- --host 127.0.0.1 --port 4175 --strictPort",
    url: "http://127.0.0.1:4175",
    reuseExistingServer: !env.CI,
    timeout: 30_000,
    env: { ...env, VITE_BUDOKON_FAULT_PROFILE: "503-once" }
  }
});
