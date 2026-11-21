import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { expect, it } from "vitest";

const readWorkflow = (file: string) =>
  readFileSync(resolve(process.cwd(), ".github/workflows", file), "utf8");

const sweepWorkflow = readWorkflow("kaseki-sweep.yml");

it("only runs the reusable sweep for the two main-branch schedule/manual callers", () => {
  expect(sweepWorkflow).toMatch(/github\.ref == 'refs\/heads\/main'/);
  expect(sweepWorkflow).toMatch(/github\.event_name == 'schedule'/);
  expect(sweepWorkflow).toMatch(/github\.event_name == 'workflow_dispatch'/);
  expect(sweepWorkflow).toMatch(
    /github\.workflow_ref == format\('\{0\}\/\.github\/workflows\/kaseki-docs\.yaml@refs\/heads\/main', github\.repository\)/,
  );
  expect(sweepWorkflow).toMatch(
    /github\.workflow_ref == format\('\{0\}\/\.github\/workflows\/kaseki-dry\.yaml@refs\/heads\/main', github\.repository\)/,
  );
});

it("accepts only each caller's intended changed-file allowlist", () => {
  expect(sweepWorkflow).toContain('case "$SWEEP_NAME:$ALLOWLIST" in');
  expect(sweepWorkflow).toContain(
    "'documentation:README.md,docs/**/*.md'|'DRY:src/**/*,api/**/*,scripts/**/*,test/**/*,tests/**/*')",
  );
});

it("publishes the sweep name as data in the submission summary", () => {
  expect(sweepWorkflow).toContain("SWEEP_NAME: ${{ inputs.sweep_name }}");
  expect(sweepWorkflow).toContain(
    'printf \'## Soyuz %s submission\\n\' "$SWEEP_NAME"',
  );
  expect(sweepWorkflow).not.toContain(
    'echo "## Soyuz ${{ inputs.sweep_name }} submission"',
  );
});

it("keeps both callers restricted to main and using the shared workflow", () => {
  for (const caller of ["kaseki-docs.yaml", "kaseki-dry.yaml"]) {
    const workflow = readWorkflow(caller);
    expect(workflow).toContain("if: github.ref == 'refs/heads/main'");
    expect(workflow).toContain("uses: $/.github/workflows/kaseki-sweep.yml");
    expect(workflow).not.toContain("KASEKI_API_TOKEN");
    expect(workflow).not.toContain("secrets: inherit");
  }
});

it("keeps the docs and DRY schedules, prompts, and scoped allowlists", () => {
  const docs = readWorkflow("kaseki-docs.yaml");
  const dry = readWorkflow("kaseki-dry.yaml");

  expect(docs).toContain('cron: "0 4 * * 1"');
  expect(docs).toContain("allowlist: README.md,docs/**/*.md");
  expect(docs).toContain("Perform the documentation sweep for this repository.");
  expect(docs).toContain("soyuz-docs-sweep-${{ github.repository }}");

  expect(dry).toContain('cron: "0 6 * * 3"');
  expect(dry).toContain("allowlist: src/**/*,api/**/*,scripts/**/*,test/**/*,tests/**/*");
  expect(dry).toContain("Identify the single strongest DRY improvement available.");
  expect(dry).toContain("soyuz-dry-sweep-${{ github.repository }}");
});

it("uses the Soyuz environment and scopes its submission token to the POST step", () => {
  expect(sweepWorkflow).toContain("environment: soyuz");
  expect(sweepWorkflow).toContain("SOYUZ_BASE_URL: ${{ vars.SOYUZ_BASE_URL }}");
  expect(sweepWorkflow).toContain("timeout-minutes: 15");
  expect(sweepWorkflow).toContain("VALIDATION_COMMAND: npm run check");
  expect(sweepWorkflow).toMatch(
    /env:\s+SOYUZ_SUBMISSION_API_TOKEN: \$\{\{ secrets\.SOYUZ_SUBMISSION_API_TOKEN \}\}/,
  );
  expect(sweepWorkflow).not.toContain("KASEKI_API_TOKEN");
  expect(sweepWorkflow).not.toContain("KASEKI_BASE_URL");
  expect(sweepWorkflow).not.toMatch(/workflow_call:[\s\S]*?secrets:/);
});

it("submits an idempotent patch request to Soyuz for a normal pull request", () => {
  expect(sweepWorkflow).toContain('"$SOYUZ_BASE_URL/v1/runs"');
  expect(sweepWorkflow).toContain('"Idempotency-Key: $idempotency_key"');
  expect(sweepWorkflow).toContain('"Authorization: Bearer $SOYUZ_SUBMISSION_API_TOKEN"');
  expect(sweepWorkflow).toContain('taskMode: "patch"');
  expect(sweepWorkflow).toContain('publishMode: "pr"');
  expect(sweepWorkflow).toContain("maxDiffBytes: 102400");
  expect(sweepWorkflow).toContain("validationCommands: [$validationCommand]");
  expect(sweepWorkflow).toContain("goalCheck: { enabled: true, maxRetries: 1 }");
  expect(sweepWorkflow).toContain(
    '. + {scouting: {enabled: false}, goalSetting: {enabled: false}}',
  );
  expect(sweepWorkflow).toContain(
    'taskPrompt: ($taskDescription + "\\n\\n" + $taskPrompt)',
  );
  expect(sweepWorkflow).toContain("TASK_PROMPT: ${{ inputs.task_prompt }}");
  expect(sweepWorkflow).not.toMatch(/publishMode:\s*["']draft/i);
});

it("validates the Soyuz URL and returned identifiers before publishing outputs", () => {
  expect(sweepWorkflow).toContain(
    "node --experimental-strip-types scripts/validate-soyuz-url.ts",
  );
  expect(sweepWorkflow).toContain("scripts/validate-soyuz-run-id.ts");
  expect(sweepWorkflow).toContain(".data.id | strings");
  expect(sweepWorkflow).toContain('test("^soyuz-[0-9]+$")');
  expect(sweepWorkflow).toContain(
    'test("^(admitting|queued|claimed|running|cancel_requested|cancelled|completed|failed|admission_failed)$")',
  );
  expect(sweepWorkflow).toMatch(/http_status.*\^\(200\|202\)\$/s);
});

it("reports Soyuz acceptance without polling or claiming execution completed", () => {
  expect(sweepWorkflow).toContain("Soyuz accepted the");
  expect(sweepWorkflow).toContain("Accepted means Soyuz admitted the task");
  expect(sweepWorkflow).toContain("Monitor the run in the Soyuz dashboard.");
  expect(sweepWorkflow).not.toContain("/status");
  expect(sweepWorkflow).not.toContain("POLLING_BUDGET_SECONDS");
  expect(sweepWorkflow).not.toContain("kaseki-agent");
  expect(sweepWorkflow).not.toContain("KASEKI_API_TOKEN");
  expect(sweepWorkflow).not.toContain("KASEKI_BASE_URL");
});

it("audits runner egress before a read-only checkout", () => {
  const hardenRunner = sweepWorkflow.indexOf("step-security/harden-runner@");
  const checkout = sweepWorkflow.indexOf("actions/checkout@");

  expect(hardenRunner).toBeGreaterThanOrEqual(0);
  expect(sweepWorkflow).toContain("egress-policy: audit");
  expect(hardenRunner).toBeLessThan(checkout);
  expect(sweepWorkflow).toContain("persist-credentials: false");
  expect(sweepWorkflow).toContain("contents: read");
});

it("routes workflow and Dependabot configuration changes to the repository owner", () => {
  const codeowners = readFileSync(
    resolve(process.cwd(), ".github/CODEOWNERS"),
    "utf8",
  );
  const entries = codeowners
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !line.startsWith("#"))
    .map((line) => {
      const [pattern, ...owners] = line.split(/\s+/);
      return { pattern, owners };
    });

  expect(entries).toContainEqual({ pattern: "/.github/workflows/", owners: ["@cyanautomation"] });
  expect(entries).toContainEqual({ pattern: "/.github/dependabot.yml", owners: ["@cyanautomation"] });
});

it("runs workflow checks for pull requests, pushes, and merge queue candidates", () => {
  const codeql = readWorkflow("codeql.yml");
  const lint = readWorkflow("workflow-lint.yml");
  const dependencyReview = readWorkflow("dependency-review.yml");

  for (const workflow of [codeql, lint, dependencyReview]) {
    expect(workflow).toContain("merge_group:");
    expect(workflow).toContain("types: [checks_requested]");
  }

  expect(dependencyReview).not.toContain("paths:");
  expect(dependencyReview).toContain("github.event.merge_group.base_ref");
  expect(dependencyReview).toContain("github.event.merge_group.head_ref");
});

it("pins CodeQL to the current v4 commit", () => {
  const codeql = readWorkflow("codeql.yml");

  expect(codeql).toContain(
    "github/codeql-action/init@33d7b85da1a04171e211befe2c739303b9a4c066 # v4",
  );
  expect(codeql).toContain(
    "github/codeql-action/analyze@33d7b85da1a04171e211befe2c739303b9a4c066 # v4",
  );
});

it("sets a seven-day default cooldown for npm and GitHub Actions updates", () => {
  const dependabot = readFileSync(
    resolve(process.cwd(), ".github/dependabot.yml"),
    "utf8",
  );

  expect(dependabot.match(/default-days: 7/g)).toHaveLength(2);
});

it("pins the zizmor action and reports findings as annotations without a write token", () => {
  const lint = readWorkflow("workflow-lint.yml");

  expect(lint).toContain(
    "zizmorcore/zizmor-action@45d7276c9ca790aabd705e31ca99c6185c3e76dd # v0.8.1",
  );
  expect(lint).toContain("advanced-security: false");
  expect(lint).toContain("annotations: true");
  expect(lint).not.toMatch(/security-events:\s*write/);
});
