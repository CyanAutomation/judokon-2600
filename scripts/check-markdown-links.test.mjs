import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { after, test } from "node:test";
import { checkMarkdownLinks } from "./check-markdown-links.mjs";

const root = mkdtempSync(join(tmpdir(), "judokon-doc-links-"));
after(() => rmSync(root, { recursive: true, force: true }));

function write(relativePath, contents) {
  const filePath = join(root, relativePath);
  mkdirSync(dirname(filePath), { recursive: true });
  writeFileSync(filePath, contents);
  return filePath;
}

test("accepts existing relative files and GitHub-style heading anchors", () => {
  const target = write("docs/guide.md", "# Setup Guide\n\n## Setup Guide\n");
  const source = write("README.md", "[guide](docs/guide.md#setup-guide) [second](docs/guide.md#setup-guide-1)");

  assert.deepEqual(checkMarkdownLinks(source), []);
  assert.ok(target);
});

test("reports missing local files", () => {
  const source = write("README.md", "[missing](docs/missing.md)");

  assert.match(checkMarkdownLinks(source).join("\n"), /docs\/missing\.md/);
});

test("reports missing heading anchors in local Markdown files", () => {
  write("docs/guide.md", "# Existing heading\n");
  const source = write("README.md", "[missing section](docs/guide.md#not-there)");

  assert.match(checkMarkdownLinks(source).join("\n"), /#not-there/);
});

test("ignores links inside fenced and inline code", () => {
  const source = write("README.md", [
    "`[inline](missing-inline.md)`",
    "```md",
    "[fenced](missing-fenced.md)",
    "```",
    "[real](missing-real.md)"
  ].join("\n"));

  const issues = checkMarkdownLinks(source);
  assert.equal(issues.length, 1);
  assert.match(issues[0], /missing-real\.md/);
});
