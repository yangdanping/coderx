# CoderX Raw Content Operations Skill Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create a project-local Skill that sends future CoderX agents directly through the model-free English-source ingest path with compact diagnostics and verification.

**Architecture:** Keep procedural guidance in `SKILL.md` and move repeated read-only checks into two shell scripts. Reuse the sibling backend's `backfill-raw` and `purge-placeholders` commands; do not duplicate the crawler or database mutation logic.

**Tech Stack:** Cursor project Skills, POSIX-compatible Zsh/Bash, PostgreSQL `psql`, `curl`, Git, Node.js.

## Global Constraints

- Store every Skill artifact under `.cursor/skills/coderx-raw-content-ops`.
- Preserve source-language English headings and paragraphs.
- Never translate, rewrite, summarize, download a model, or call Ollama.
- Never change VPN nodes.
- Default to local PostgreSQL and stop before production.
- Do not store database credentials.
- Preserve unrelated dirty frontend files.

---

### Task 1: Write the Skill and evaluation cases

**Files:**
- Create: `.cursor/skills/coderx-raw-content-ops/SKILL.md`
- Create: `.cursor/skills/coderx-raw-content-ops/evals/evals.json`

**Interfaces:**
- Consumes: CoderX article-ingest requests and the sibling `coderx_server` repository.
- Produces: a triggerable workflow that selects `backfill-raw`, uses at most five candidates by default, and stops before production.

- [ ] **Step 1: Add evaluation prompts**

Create three prompts covering raw English ingestion, placeholder cleanup, and a request that must stop before production. Each expected output must explicitly require `backfill-raw`, forbid Ollama and VPN changes, and require compact verification.

- [ ] **Step 2: Validate the evaluation JSON**

Run:

```bash
node -e "JSON.parse(require('fs').readFileSync('.cursor/skills/coderx-raw-content-ops/evals/evals.json'))"
```

Expected: exit code `0`.

- [ ] **Step 3: Write `SKILL.md`**

Use YAML frontmatter:

```yaml
---
name: coderx-raw-content-ops
description: >-
  Runs CoderX AI article collection and backfill through the model-free raw
  English source path...
---
```

The body must define trigger scope, non-negotiable boundaries, backend discovery, fast path, failure triage, runtime asset synchronization, concise communication rules, and final verification.

- [ ] **Step 4: Validate required Skill language**

Run focused searches proving that `SKILL.md` includes `backfill-raw`, English-source preservation, Ollama prohibition, VPN prohibition, five-item default, and production boundary.

- [ ] **Step 5: Commit**

```bash
git add -f .cursor/skills/coderx-raw-content-ops/SKILL.md \
  .cursor/skills/coderx-raw-content-ops/evals/evals.json
git commit -m "feat(skill): add raw content operations guidance"
```

### Task 2: Add compact read-only diagnostics

**Files:**
- Create: `.cursor/skills/coderx-raw-content-ops/scripts/preflight.sh`
- Create: `.cursor/skills/coderx-raw-content-ops/scripts/verify-local.sh`
- Create: `.cursor/skills/coderx-raw-content-ops/tests/scripts.test.sh`

**Interfaces:**
- Consumes: optional `CODERX_BACKEND_DIR`, `CODERX_API_ORIGIN`, `CODERX_ARTICLE_IDS`, and standard `PG*` variables.
- Produces: concise `key=value` diagnostics; exits nonzero with one actionable error when a required dependency or invariant fails.

- [ ] **Step 1: Write failing script-contract tests**

The test must assert that:

```bash
preflight.sh --help
verify-local.sh --help
```

both exit successfully, neither script contains a literal `PGPASSWORD=`, both scripts are read-only, and backend discovery prefers a repository with `backfill-raw`.

- [ ] **Step 2: Run tests and verify failure**

Run:

```bash
bash .cursor/skills/coderx-raw-content-ops/tests/scripts.test.sh
```

Expected: fail because the scripts do not exist.

- [ ] **Step 3: Implement `preflight.sh`**

Resolve the frontend root from the script location, accept a backend override,
prefer `../coderx_server` when it exposes `backfill-raw`, otherwise use
`../coderx_server/.worktrees/ai-content-ingest`. Check commands, PostgreSQL,
the API listener and its working directory, then print a compact summary.

- [ ] **Step 4: Implement `verify-local.sh`**

Require comma-separated article IDs, query article/author/image metadata, call
every original and thumbnail URL, run the placeholder cleanup command in dry-run
mode, and print only aggregate success counts. Never mutate the database.

- [ ] **Step 5: Run contract tests**

Run:

```bash
bash .cursor/skills/coderx-raw-content-ops/tests/scripts.test.sh
```

Expected: all assertions pass.

- [ ] **Step 6: Run live read-only checks**

Run:

```bash
PGPASSWORD=123456 .cursor/skills/coderx-raw-content-ops/scripts/preflight.sh
PGPASSWORD=123456 CODERX_ARTICLE_IDS=143,146,150,151,152 \
  .cursor/skills/coderx-raw-content-ops/scripts/verify-local.sh
```

Expected: database and API checks pass; 5 articles, 5 authors, 12 original images, 12 thumbnails, and zero placeholders are reported.

- [ ] **Step 7: Commit**

```bash
git add -f .cursor/skills/coderx-raw-content-ops/scripts \
  .cursor/skills/coderx-raw-content-ops/tests
git commit -m "feat(skill): add compact ingest diagnostics"
```

### Task 3: Final validation

**Files:**
- Modify: `.cursor/skills/coderx-raw-content-ops/SKILL.md` only if verification finds an ambiguity.

**Interfaces:**
- Consumes: all Skill artifacts.
- Produces: a clean, triggerable, self-contained project Skill.

- [ ] **Step 1: Validate structure and formatting**

Run:

```bash
git diff --check HEAD~2..HEAD
test -f .cursor/skills/coderx-raw-content-ops/SKILL.md
test -x .cursor/skills/coderx-raw-content-ops/scripts/preflight.sh
test -x .cursor/skills/coderx-raw-content-ops/scripts/verify-local.sh
```

Expected: exit code `0`.

- [ ] **Step 2: Run the contract and live checks once**

Run the script-contract test, preflight, and local verification once. Do not run
the frontend or backend full suites because this task adds only Skill resources
and read-only shell helpers.

- [ ] **Step 3: Confirm repository scope**

Use `git status --short` to verify that only the user's pre-existing frontend
changes remain unstaged and that no production or remote state changed.
