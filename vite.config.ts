import { defineConfig } from "vitest/config";
import { VitePWA } from "vite-plugin-pwa";
import { fileURLToPath } from "node:url";
import { budokonTransportFor, type BudokonTransport } from "./src/dev/budokon-simulator/transportSelection.ts";

const transportEntries: Record<BudokonTransport, string> = {
  simulator: "./src/dev/budokon-simulator/transport.ts",
  chaos: "./src/dev/budokon-simulator/chaosTransport.ts",
  live: "./src/api/liveTransport.ts"
};

export default defineConfig(({ command, mode }) => ({
  resolve: {
    alias: {
      "budokon-transport": fileURLToPath(new URL(
        transportEntries[budokonTransportFor(command, mode)],
        import.meta.url
      ))
    }
  },
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
