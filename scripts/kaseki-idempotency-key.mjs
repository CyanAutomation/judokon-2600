import { Buffer } from "node:buffer";
import { createHash } from "node:crypto";
import { resolve } from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const URL_NAMESPACE = "6ba7b811-9dad-11d1-80b4-00c04fd430c8";

export function createUuidV5(namespaceUuid, name) {
  const namespaceHex = namespaceUuid.replaceAll("-", "");
  if (!/^[0-9a-f]{32}$/i.test(namespaceHex) || typeof name !== "string") {
    throw new TypeError("a valid namespace UUID and string name are required");
  }

  const namespace = Buffer.from(namespaceHex, "hex");
  const bytes = createHash("sha1")
    .update(namespace)
    .update(name, "utf8")
    .digest()
    .subarray(0, 16);
  bytes[6] = (bytes[6] & 0x0f) | 0x50;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;

  const hex = bytes.toString("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

export function createKasekiIdempotencyKey({ repository, workflow, runId }) {
  if (
    ![repository, workflow, runId].every(
      (value) => typeof value === "string" && value.length > 0,
    )
  ) {
    throw new TypeError("repository, workflow, and runId are required");
  }

  return createUuidV5(URL_NAMESPACE, JSON.stringify([repository, workflow, runId]));
}

const scriptPath = process.argv[1] ? resolve(process.argv[1]) : "";
if (scriptPath === fileURLToPath(import.meta.url)) {
  try {
    const { GITHUB_REPOSITORY: repository, GITHUB_WORKFLOW: workflow, GITHUB_RUN_ID: runId } = process.env;
    if (!repository || !workflow || !runId) {
      throw new TypeError(
        "GITHUB_REPOSITORY, GITHUB_WORKFLOW, and GITHUB_RUN_ID environment variables are required",
      );
    }

    process.stdout.write(`${createKasekiIdempotencyKey({ repository, workflow, runId })}\n`);
  } catch (error) {
    process.stderr.write(`${error instanceof Error ? error.message : "Unable to create idempotency key"}\n`);
    process.exitCode = 1;
  }
}
