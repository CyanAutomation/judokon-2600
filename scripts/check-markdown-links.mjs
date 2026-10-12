import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, extname, join, relative, resolve } from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

function withoutCode(markdown) {
  let fence = null;
  const lines = markdown.split("\n").map((line) => {
    const marker = line.match(/^\s*(`{3,}|~{3,})/);
    if (!fence && marker) {
      fence = { character: marker[1][0], length: marker[1].length };
      return "";
    }
    if (fence) {
      const closing = new RegExp(`^\\s*\\${fence.character}{${fence.length},}\\s*$`);
      if (closing.test(line)) fence = null;
      return "";
    }
    return line.replace(/(`+)[^`\n]*\1/g, "");
  });
  return lines.join("\n");
}

function isHtmlTagStartCharacter(character) {
  if (!character) return false;
  const code = character.charCodeAt(0);
  return (code >= 65 && code <= 90)
    || (code >= 97 && code <= 122)
    || character === "/"
    || character === "!"
    || character === "?";
}

function findHtmlTagEnd(source, start) {
  if (source.startsWith("<!--", start)) {
    const commentEnd = source.indexOf("-->", start + 4);
    return commentEnd === -1 ? -1 : commentEnd + 2;
  }

  let quote = null;
  for (let index = start + 1; index < source.length; index += 1) {
    const character = source[index];
    if (quote) {
      if (character === quote) quote = null;
    } else if (character === "\"" || character === "'") {
      quote = character;
    } else if (character === ">") {
      return index;
    }
  }
  return -1;
}

function withoutInlineHtmlTags(source) {
  const parts = [];
  let textStart = 0;
  let index = 0;
  while (index < source.length) {
    if (source[index] !== "<" || !isHtmlTagStartCharacter(source[index + 1])) {
      index += 1;
      continue;
    }
    const tagEnd = findHtmlTagEnd(source, index);
    if (tagEnd === -1) break;
    parts.push(source.slice(textStart, index));
    textStart = tagEnd + 1;
    index = textStart;
  }
  parts.push(source.slice(textStart));
  return parts.join("");
}

function headingSlugs(markdown) {
  const slugs = new Set();
  const counts = new Map();
  for (const match of withoutCode(markdown).matchAll(/^\s{0,3}#{1,6}\s+(.+?)\s*#*\s*$/gm)) {
    const base = withoutInlineHtmlTags(match[1])
      .replace(/[`*_~]/g, "")
      .toLowerCase()
      .replace(/[^\p{L}\p{N}_ -]/gu, "")
      .trim()
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-");
    if (!base) continue;
    const count = counts.get(base) ?? 0;
    counts.set(base, count + 1);
    slugs.add(count === 0 ? base : `${base}-${count}`);
  }
  return slugs;
}

function parseDestination(rawDestination) {
  const destination = rawDestination.startsWith("<") && rawDestination.endsWith(">")
    ? rawDestination.slice(1, -1)
    : rawDestination;
  const separator = destination.indexOf("#");
  const pathname = separator === -1 ? destination : destination.slice(0, separator);
  const fragment = separator === -1 ? "" : destination.slice(separator + 1);
  return { pathname, fragment };
}

function displayPath(path) {
  return relative(process.cwd(), path) || path;
}

/** Check relative file links and heading anchors in one Markdown document. */
export function checkMarkdownLinks(filePath) {
  const absoluteFile = resolve(filePath);
  const source = readFileSync(absoluteFile, "utf8");
  const issues = [];
  const linkPattern = /!?\[[^\]]*\]\(\s*(<[^>]+>|[^\s)]+)(?:\s+["'][^"']*["'])?\s*\)/g;

  for (const match of withoutCode(source).matchAll(linkPattern)) {
    const rawDestination = match[1];
    const { pathname, fragment } = parseDestination(rawDestination);
    if (/^(?:[a-z][a-z\d+.-]*:|\/\/)/i.test(pathname)) continue;

    let targetPath;
    try {
      const decodedPath = decodeURIComponent(pathname);
      if (!pathname) {
        targetPath = absoluteFile;
      } else if (pathname.startsWith("/")) {
        targetPath = resolve(process.cwd(), `.${decodedPath}`);
      } else {
        targetPath = resolve(dirname(absoluteFile), decodedPath);
      }
    } catch {
      issues.push(`${displayPath(absoluteFile)}: invalid encoded link ${rawDestination}`);
      continue;
    }

    if (!existsSync(targetPath)) {
      issues.push(`${displayPath(absoluteFile)}: missing local target ${pathname}`);
      continue;
    }
    if (!fragment || extname(targetPath).toLowerCase() !== ".md") continue;

    let targetMarkdown;
    try {
      targetMarkdown = readFileSync(targetPath, "utf8");
    } catch {
      issues.push(`${displayPath(absoluteFile)}: cannot read Markdown target ${pathname}`);
      continue;
    }
    let decodedFragment;
    try {
      decodedFragment = decodeURIComponent(fragment).toLowerCase();
    } catch {
      decodedFragment = fragment.toLowerCase();
    }
    if (!headingSlugs(targetMarkdown).has(decodedFragment)) {
      issues.push(`${displayPath(absoluteFile)}: missing heading anchor #${fragment} in ${pathname || displayPath(targetPath)}`);
    }
  }
  return issues;
}

function markdownFiles(directory) {
  if (!existsSync(directory)) return [];
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = join(directory, entry.name);
    if (entry.isDirectory()) return markdownFiles(entryPath);
    return entry.isFile() && entry.name.toLowerCase().endsWith(".md") ? [entryPath] : [];
  });
}

function run() {
  const root = process.cwd();
  const files = [join(root, "README.md"), ...markdownFiles(join(root, "docs"))];
  const issues = files.flatMap(checkMarkdownLinks);
  if (issues.length) {
    for (const issue of issues) process.stderr.write(`${issue}\n`);
    process.exitCode = 1;
    return;
  }
  process.stdout.write(`Checked local Markdown links in ${files.length} files.\n`);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) run();
