import { Buffer } from "node:buffer";
import { access, readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const manifestPath = resolve(repositoryRoot, "public/site.webmanifest");

function readPngDimensions(buffer) {
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  expect(buffer.subarray(0, 8)).toEqual(signature);
  expect(buffer.toString("ascii", 12, 16)).toBe("IHDR");
  return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
}

describe("installable web app manifest", () => {
  it("declares the app shell and platform install metadata", async () => {
    const manifest = JSON.parse(await readFile(manifestPath, "utf8"));

    expect(manifest).toMatchObject({
      id: "/",
      start_url: "/",
      scope: "/",
      lang: "en",
      categories: ["games"],
      orientation: "any",
      name: "JU-DO-KON! Classic Battle",
      short_name: "JU-DO-KON",
      theme_color: "#071006",
      background_color: "#071006",
      display: "standalone"
    });
  });

  it("declares existing icon files whose PNG dimensions match their sizes", async () => {
    const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
    expect(manifest.icons).toEqual(expect.arrayContaining([
      expect.objectContaining({ src: "/favicon.svg", sizes: "any", purpose: "any" }),
      expect.objectContaining({ src: "/icon-192.png", sizes: "192x192", purpose: "any", type: "image/png" }),
      expect.objectContaining({ src: "/icon-512.png", sizes: "512x512", purpose: "any", type: "image/png" }),
      expect.objectContaining({ src: "/icon-512-maskable.png", sizes: "512x512", purpose: "maskable", type: "image/png" }),
      expect.objectContaining({ src: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" })
    ]));

    for (const icon of manifest.icons) {
      const iconPath = resolve(repositoryRoot, "public", icon.src.replace(/^\//, ""));
      await expect(access(iconPath)).resolves.toBeUndefined();
      if (icon.type !== "image/png") continue;

      const declared = /^([0-9]+)x([0-9]+)$/.exec(icon.sizes);
      expect(declared, `${icon.src} must declare numeric pixel dimensions`).not.toBeNull();
      if (!declared) continue;
      const dimensions = readPngDimensions(await readFile(iconPath));
      expect(dimensions).toEqual({ width: Number(declared[1]), height: Number(declared[2]) });
    }
  });
});
