export function createUuidV5(namespaceUuid: string, name: string): string;

export function createKasekiIdempotencyKey(input: {
  repository: string;
  workflow: string;
  runId: string;
}): string;
