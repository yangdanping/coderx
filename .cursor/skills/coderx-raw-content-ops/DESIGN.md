# CoderX Raw Content Operations Skill Design

## Goal

Create a project-local Cursor skill that lets future agents import public AI
articles into CoderX quickly, preserve the English source text and related
images, and avoid the abandoned Chinese-rewrite and Ollama workflow.

## Location and trigger

The skill lives at:

`/Users/yangdanping/Desktop/personal_project/coderx/.cursor/skills/coderx-raw-content-ops`

It should trigger for CoderX requests involving AI article collection, raw
article backfill, source-image localization, placeholder cleanup, local review,
or scheduling the content-ingest worker.

## Operational boundaries

- Use the existing backend ingest implementation in the sibling
  `coderx_server` repository.
- Preserve readable English headings and paragraphs from the public source.
- Download source images into CoderX storage and keep the article editable as
  Tiptap JSON.
- Never translate, rewrite, summarize, download a model, or call Ollama in the
  raw ingest path.
- Never change VPN nodes.
- Work against local PostgreSQL and local assets by default.
- Never deploy, enable the production PM2 worker, or mutate a remote database
  without explicit user authorization.
- Use only existing CoderX users as authors.
- Limit one batch to at most five articles unless the user explicitly changes
  the limit.

## Fast-path workflow

1. Inspect the backend branch, database connectivity, running API process
   working directory, candidate state, and image directories in one preflight.
2. Reuse `pnpm ingest backfill-raw`; do not design another crawler or enrichment
   pipeline.
3. If placeholder cleanup is requested, run the exact structural dry run, save
   its manifest, and only then apply the cleanup.
4. Detect a worktree/runtime directory mismatch before debugging HTTP routes.
   Synchronize only the generated image assets needed by the current local API.
5. Verify database rows and all original/thumbnail image URLs in one concise
   check.
6. Run focused ingest tests during changes and the full application suite once,
   at the final verification gate.
7. Stop before production.

## Bundled resources

- `SKILL.md`: decision rules, fast path, failure triage, commands, and concise
  communication contract.
- `scripts/preflight.sh`: read-only environment and runtime diagnosis with
  compact output.
- `scripts/verify-local.sh`: read-only database/API/image verification with
  compact output.
- `evals/evals.json`: representative prompts that check raw ingest, placeholder
  cleanup, and production-boundary behavior.

The scripts must not store a database password. They consume PostgreSQL
environment variables, accept backend/API overrides, and fail with a concise
actionable message.

## Noise and time controls

- Report only phase transitions, counts, blockers, and final evidence.
- Suppress successful per-test and per-image logs; show details only on failure.
- Do not repeatedly inspect the same database rows or rerun the full suite.
- Do not browse broadly when a candidate ID or canonical URL already exists.
- Do not infer a routing bug before checking the API process working directory
  and the physical image file.

## Verification

- Validate the skill frontmatter and required sections.
- Run both scripts in read-only mode against the current local environment.
- Verify that representative evaluation prompts direct agents to
  `backfill-raw`, preserve English source content, avoid Ollama/VPN changes, and
  stop before production.
- Commit only the new design, plan, and skill files; preserve unrelated dirty
  frontend files.
