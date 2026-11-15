# Fallow workflows in this repository

This page records only repository-specific commands and interpretation guidance. For complete flags, supported output fields, and Fallow behavior, consult the locked CLI with `npm exec -- fallow <command> --help` or `npm exec -- fallow schema`; do not copy a stale upstream CLI manual into this repository.

## Repository configuration

- The project locks Fallow as a development dependency. Use `npm exec -- fallow`; do not use an unpinned `npx` invocation for routine analysis.
- `.fallowrc.json` adds `api/**/*.ts` as entry points. Inspect the resolved setup with `npm exec -- fallow config` before trusting reachability results in API routes.
- Fallow is not part of GitHub CI. `npm run check` runs lint, tests, Markdown checks, and the production build. `npm run fallow:coverage` runs the tests with coverage and then analyzes the generated Istanbul report.

## Common local workflows

```sh
# Inspect unused code and dependencies
npm exec -- fallow dead-code

# Inspect duplication or complexity
npm exec -- fallow dupes
npm exec -- fallow health

# Review the changed code; specify a deliberate base when the default is ambiguous
npm exec -- fallow audit --changed-since origin/main

# Analyze test coverage with Fallow's coverage support
npm run fallow:coverage
```

Use Fallow's human output for direct review. Add `--format json --quiet` when structured results are needed; keep stderr separate from JSON and preserve the exit code. Check live help before using any flags shown in examples outside this page.

## Interpret findings

- Treat static findings as leads. Check framework conventions, dynamic imports, test references, and callers before removing code or dependencies.
- A scoped or changed-file result is not a whole-project result. State the scope when reporting conclusions.
- Use trace options from the current CLI help when reachability is unclear.
- Review `fallow fix --dry-run` before considering edits. A preview is not authorization; only apply changes when the user requested implementation, then inspect the diff.
- Fallow security output is candidate discovery, not proof that a vulnerability exists. Validate candidates against code paths and use the repository's CodeQL workflow as a separate security check.
- Do not enable telemetry, cloud collection, or remote config inheritance unless the user explicitly asks for that setup.

## Updating this guidance

When the locked Fallow version changes, compare these commands and safety rules with the installed version's CLI help and shipped skill/reference files. Keep this page repository-specific rather than importing a full generic manual. If Fallow configuration or installation becomes a recurring task, evaluate its shipped `fallow-setup` skill then.
