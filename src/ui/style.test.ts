import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const stylesheet = readFileSync(resolve(process.cwd(), "src/style.css"), "utf8");

describe("responsive menu help styles", () => {
  it("shows touch guidance only on coarse-pointer devices", () => {
    const touchMediaStart = stylesheet.indexOf("@media (hover: none) and (pointer: coarse)");
    const defaultStyles = stylesheet.slice(0, touchMediaStart);
    const touchMedia = stylesheet.slice(touchMediaStart);
    const defaultTouchRule = defaultStyles.match(/\.menu-help__touch\s*\{([^}]*)\}/);

    expect(defaultTouchRule).not.toBeNull();
    expect(defaultTouchRule?.[1] ?? "").toMatch(/display:\s*none/);
    expect(touchMedia).toMatch(/\.menu-help__touch\s*\{\s*display:\s*inline;\s*\}/);
  });
});
