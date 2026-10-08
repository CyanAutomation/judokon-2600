import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const readWorkflow = (file: string) =>
  readFileSync(resolve(process.cwd(), ".github/workflows", file), "utf8");

const sweepWorkflow = readWorkflow("kaseki-sweep.yml");

describe("Kaseki workflow boundaries", () => {
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

  it("passes the sweep name to the summary as data rather than shell source", () => {
    expect(sweepWorkflow).toContain("SWEEP_NAME: ${{ inputs.sweep_name }}");
    expect(sweepWorkflow).toContain(
      'printf \'## Kaseki %s sweep\\n\' "$SWEEP_NAME"',
    );
    expect(sweepWorkflow).not.toContain(
      'echo "## Kaseki ${{ inputs.sweep_name }} sweep"',
    );
  });

  it("keeps both callers restricted to main", () => {
    expect(readWorkflow("kaseki-docs.yaml")).toContain(
      "if: github.ref == 'refs/heads/main'",
    );
    expect(readWorkflow("kaseki-dry.yaml")).toContain(
      "if: github.ref == 'refs/heads/main'",
    );
  });

  it("requires and explicitly passes the Kaseki token through both callers", () => {
    expect(sweepWorkflow).toMatch(
      /workflow_call:[\s\S]*?secrets:\s+KASEKI_API_TOKEN:[\s\S]*?required: true/,
    );

    for (const caller of ["kaseki-docs.yaml", "kaseki-dry.yaml"]) {
      const workflow = readWorkflow(caller);
      expect(workflow).toMatch(
        /secrets:\s+KASEKI_API_TOKEN:\s+\$\{\{ secrets\.KASEKI_API_TOKEN \}\}/,
      );
      expect(workflow).not.toContain("secrets: inherit");
    }
  });

  it("always submits sweeps as normal pull requests", () => {
    expect(sweepWorkflow).toContain('publishMode: "pr"');
    expect(sweepWorkflow).not.toMatch(/publishMode:\s*["']draft/i);
  });

  it("assigns workflow and Dependabot changes to the repository owner", () => {
    const codeowners = readFileSync(
      resolve(process.cwd(), ".github/CODEOWNERS"),
      "utf8",
    );

    expect(codeowners).toContain("/.github/workflows/ @cyanautomation");
    expect(codeowners).toContain("/.github/dependabot.yml @cyanautomation");
  });

  it("retries transient status poll failures without swallowing permanent client errors", () => {
    expect(sweepWorkflow).toMatch(/if http_status="\$\(curl/);
    expect(sweepWorkflow).toContain("--write-out '%{http_code}'");
    expect(sweepWorkflow).toMatch(/http_status" != 408/);
    expect(sweepWorkflow).toMatch(/http_status" != 429/);
    expect(sweepWorkflow).toContain("retrying status poll");
  });
});
