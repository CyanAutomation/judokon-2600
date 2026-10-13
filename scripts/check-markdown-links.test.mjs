import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, relative, sep } from "node:path";
import process from "node:process";
import { afterAll, describe, expect, it } from "vitest";
import { checkMarkdownLinks } from "./check-markdown-links.mjs";

const root = mkdtempSync(join(tmpdir(), "judokon-doc-links-"));
const projectRoot = mkdtempSync(join(process.cwd(), ".markdown-links-root-"));
afterAll(() => {
  rmSync(root, { recursive: true, force: true });
  rmSync(projectRoot, { recursive: true, force: true });
});

function write(relativePath, contents) {
  const filePath = join(root, relativePath);
  mkdirSync(dirname(filePath), { recursive: true });
  writeFileSync(filePath, contents);
  return filePath;
}

describe("checkMarkdownLinks", () => {
  it("accepts existing relative files and GitHub-style heading anchors", () => {
    const target = write("docs/guide.md", "# Setup Guide\n\n## Setup Guide\n");
    const source = write("README.md", "[guide](docs/guide.md#setup-guide) [second](docs/guide.md#setup-guide-1)");

    expect(checkMarkdownLinks(source)).toEqual([]);
    expect(target).toBeTruthy();
  });

  it("strips inline HTML from slugs without dropping angle-bracket prose", () => {
    write("docs/guide.md", [
      "# <em>Styled heading</em>",
      "# Compare x < y > z",
      "# <script",
      "# Intro <!-- note \" > hidden --> End"
    ].join("\n"));
    const source = write("README.md", [
      "[styled](docs/guide.md#styled-heading)",
      "[comparison](docs/guide.md#compare-x-y-z)",
      "[partial tag](docs/guide.md#script)",
      "[comment](docs/guide.md#intro-end)"
    ].join(" "));

    expect(checkMarkdownLinks(source)).toEqual([]);
  });

  it("reports missing local files", () => {
    const source = write("README.md", "[missing](docs/missing.md)");

    expect(checkMarkdownLinks(source).join("\n")).toMatch(/docs\/missing\.md/);
  });

  it("resolves percent-encoded root-relative paths from the project root", () => {
    const target = join(projectRoot, "guide.md");
    writeFileSync(target, "# Guide\n");
    const encodedPath = relative(process.cwd(), target)
      .split(sep)
      .map(encodeURIComponent)
      .join("%2F");
    const source = write("root-relative.md", `[guide](%2F${encodedPath})`);

    expect(checkMarkdownLinks(source)).toEqual([]);
  });

  it("reports missing heading anchors in local Markdown files", () => {
    write("docs/guide.md", "# Existing heading\n");
    const source = write("README.md", "[missing section](docs/guide.md#not-there)");

    expect(checkMarkdownLinks(source).join("\n")).toMatch(/#not-there/);
  });

  it("checks fragment-only links against the source document", () => {
    const source = write("README.md", "# Setup guide\n\n[valid](#setup-guide) [missing](#not-there)");

    const issues = checkMarkdownLinks(source);
    expect(issues).toHaveLength(1);
    expect(issues[0]).toMatch(/#not-there/);
  });

  it("ignores links inside fenced and inline code", () => {
    const source = write("README.md", [
      "`[inline](missing-inline.md)`",
      "```md",
      "[fenced](missing-fenced.md)",
      "```",
      "[real](missing-real.md)"
    ].join("\n"));

    const issues = checkMarkdownLinks(source);
    expect(issues).toHaveLength(1);
    expect(issues[0]).toMatch(/missing-real\.md/);
  });

  it("ignores external destinations", () => {
    const source = write("README.md", [
      "[web](https://example.com/guide#setup)",
      "[email](mailto:help@example.com)",
      "[protocol-relative](//example.com/guide)"
    ].join(" "));

    expect(checkMarkdownLinks(source)).toEqual([]);
  });

  it("reports paths with invalid percent encoding", () => {
    const source = write("README.md", "[bad](docs/%E0%A4%A.md)");

    expect(checkMarkdownLinks(source).join("\n")).toMatch(/invalid encoded link/);
  });
});
