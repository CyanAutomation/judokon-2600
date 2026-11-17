import { defineConfig } from "vitest/config";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig(({ command }) => ({
  plugins: command === "build" ? [VitePWA({
    strategies: "injectManifest",
    srcDir: "src",
    filename: "sw.js",
    injectRegister: false,
    registerType: "prompt",
    manifest: false,
    includeAssets: [
      "favicon.svg",
      "site.webmanifest",
      "icon-192.png",
      "icon-512.png",
      "icon-512-maskable.png",
      "apple-touch-icon.png"
    ],
    includeManifestIcons: false,
    injectManifest: {
      globPatterns: ["index.html", "assets/**/*.{js,css,ico,png,svg,webp,avif,woff,woff2}"],
      globIgnores: ["**/sw.js"],
      injectionPoint: "self.__WB_MANIFEST",
      maximumFileSizeToCacheInBytes: 5 * 1024 * 1024
    }
  })] : [],
  test: {
    environment: "jsdom",
    include: ["src/**/*.test.ts", "scripts/**/*.test.mjs"]
  }
}));
