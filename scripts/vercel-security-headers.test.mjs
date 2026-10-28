import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { expect, it } from "vitest";

const configPath = resolve(dirname(fileURLToPath(import.meta.url)), "../vercel.json");
const config = JSON.parse(await readFile(configPath, "utf8"));

it("Vercel applies browser security headers to every route", () => {
  const route = config.headers.find(({ source }) => source === "/(.*)");
  expect(route, "security headers must cover the app and API routes").toBeDefined();

  const headers = Object.fromEntries(route.headers.map(({ key, value }) => [key.toLowerCase(), value]));
  expect(headers["x-content-type-options"]).toBe("nosniff");
  expect(headers["x-frame-options"]).toBe("DENY");
  expect(headers["referrer-policy"]).toBe("strict-origin-when-cross-origin");
  expect(headers["permissions-policy"]).toBe("camera=(), microphone=(), geolocation=()");

  const policy = headers["content-security-policy"];
  expect(policy, "a Content Security Policy must be configured").toBeDefined();
  for (const directive of [
    "default-src 'self'",
    "base-uri 'self'",
    "object-src 'none'",
    "frame-ancestors 'none'",
    "form-action 'self'",
    "script-src 'self'",
    "style-src 'self'",
    "connect-src 'self' https://budokon.scheimann.workers.dev https://vitals.vercel-insights.com"
  ]) {
    expect(policy.split(";").map((item) => item.trim()), `missing CSP directive: ${directive}`).toContain(directive);
  }
});
