import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import process from "node:process";
import { pathToFileURL } from "node:url";

const fallbackDetail = "Controller reported failure without a reason. Inspect the run details.";
const maxDetailLength = 300;

function asMessage(value) {
  if (typeof value === "string") return value;
  if (typeof value === "object" && value !== null && typeof value.message === "string") {
    return value.message;
  }
  return "";
}

/** Return a short, single-line message safe to place in a workflow command or summary. */
export function sanitizedRunFailureDetail(payload) {
  if (typeof payload !== "object" || payload === null) return fallbackDetail;

  const result = typeof payload.result === "object" && payload.result !== null
    ? payload.result
    : {};
  const message = [
    payload.error,
    payload.failureReason,
    payload.reason,
    payload.message,
    result.error,
    result.failureReason,
    result.message
  ].map(asMessage).find((candidate) => candidate.trim().length > 0);

  if (!message) return fallbackDetail;

  const safeMessage = message
    .replace(/[^\p{L}\p{N}\s.,:;!?_-]/gu, " ")
    .replace(/\s+/gu, " ")
    .trim()
    .slice(0, maxDetailLength);

  return safeMessage || fallbackDetail;
}

function main() {
  const responsePath = process.argv[2];
  if (!responsePath) {
    process.stderr.write("Usage: node scripts/kaseki-run-details.mjs RESPONSE_FILE\n");
    process.exitCode = 2;
    return;
  }

  try {
    const payload = JSON.parse(readFileSync(responsePath, "utf8"));
    process.stdout.write(`${sanitizedRunFailureDetail(payload)}\n`);
  } catch {
    process.stdout.write(`${fallbackDetail}\n`);
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main();
}
