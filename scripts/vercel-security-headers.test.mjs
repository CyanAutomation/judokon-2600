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

it("keeps app documents fresh while caching root-level public assets briefly", () => {
  const policy = source => config.headers.find(({ source: candidate }) => candidate === source);
  const documentHeaders = Object.fromEntries(policy("/").headers.map(({ key, value }) => [key.toLowerCase(), value]));
  const faviconHeaders = Object.fromEntries(policy("/favicon.svg").headers.map(({ key, value }) => [key.toLowerCase(), value]));
  const manifestHeaders = Object.fromEntries(policy("/site.webmanifest").headers.map(({ key, value }) => [key.toLowerCase(), value]));

  expect(documentHeaders["cache-control"]).toBe("public, max-age=0, must-revalidate");
  expect(faviconHeaders["cache-control"]).toBe("public, max-age=3600, stale-while-revalidate=86400");
  expect(manifestHeaders["cache-control"]).toBe("public, max-age=3600, stale-while-revalidate=86400");
});
