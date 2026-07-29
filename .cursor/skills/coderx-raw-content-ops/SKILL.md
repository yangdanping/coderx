---
name: coderx-raw-content-ops
description: >-
  Runs CoderX AI article collection, raw article backfill, source-image
  localization, fixed-placeholder cleanup, and local verification through the
  model-free English-source workflow. Use whenever work in CoderX mentions
  importing or refreshing AI articles, preserving original articles and images,
  cleaning “摘要 / 为什么值得阅读 / 来源” placeholders, debugging missing ingest
  images, scheduling content supply, or preparing a local batch before
  production. This skill must win over any Chinese rewrite, translation, or
  Ollama-based enrichment workflow unless the user explicitly requests a
  separate translation task.
compatibility: Requires the sibling coderx_server repository, Node.js, pnpm, psql, curl, and local PostgreSQL credentials supplied through PG environment variables.
---

# CoderX raw content operations

Use the backend's existing ingest pipeline to place readable public-source
articles and their images into CoderX. Optimize for a short, observable path:
one preflight, one bounded mutation, one verification.

## Non-negotiable path

- Preserve the source-language English title, headings, paragraphs, author,
  publication time, canonical URL, and useful source images.
- Use `backfill-raw`. Do not use `enrich`, `backfill-rich`, or the combined
  `run` command.
- Do not translate, rewrite, summarize, download a model, start a model, or call
  Ollama. If translation is later requested, first finish and verify raw ingest,
  then treat translation as a separate user-directed task.
- Do not change the local VPN node.
- Use existing active CoderX users. Never create robot or synthetic accounts.
- Default to at most five articles per batch and dates within the previous
  30 days.
- Default to the local database and local asset storage. Do not deploy, enable
  the production PM2 worker, or mutate a remote database without explicit
  authorization.

## Resolve the backend once

The frontend repository contains this Skill; ingest code lives in the sibling
`coderx_server` repository.

1. Honor `CODERX_BACKEND_DIR` when supplied.
2. Otherwise prefer `../coderx_server` when its CLI contains `backfill-raw`.
3. During unmerged development, fall back to
   `../coderx_server/.worktrees/ai-content-ingest`.
4. Run all ingest commands from the resolved backend directory.

Use the bundled check before exploratory debugging:

```bash
PGPASSWORD='<local password>' \
  .cursor/skills/coderx-raw-content-ops/scripts/preflight.sh
```

Never print or persist the password.

## Fast path

### 1. Establish the exact batch

If candidate IDs already exist, use them directly. Do not browse for
replacement sources or recollect feeds. `backfill-raw` accepts either unmapped
`pending` candidates for new publication or mapped `published` candidates for
in-place replacement.

If candidates do not exist, collect without enrichment:

```bash
pnpm ingest collect --days 30 --limit 10 --per-source-limit 2
pnpm ingest list --status pending,published --limit 20
```

Do not run `enrich`. Raw publication requires existing configured authors and
the existing `人工智能` tag.

Before mutation, confirm:

- every requested candidate is either unmapped `pending` or correctly mapped
  `published`;
- canonical URLs are unique;
- sources are distinct within the batch;
- there are 1–5 candidate IDs;
- the author pool contains enough distinct existing user IDs.
- the `人工智能` tag already exists.

### 2. Import raw source content

```bash
PGHOST=127.0.0.1 \
PGPORT=5432 \
PGDATABASE=coderx \
PGUSER=postgres \
PGPASSWORD='<local password>' \
INGEST_AUTHOR_IDS='1,2,3,4,5' \
PUBLIC_API_ORIGIN='http://192.168.3.96:8000' \
pnpm ingest backfill-raw --ids '72,3,35,23,55' --limit 5
```

Replace IDs and authors with the reviewed batch. `backfill-raw` must retain
readable source structure, write editable Tiptap JSON, download up to three
useful images per article, create JPEG thumbnails, and transactionally create
an article for an eligible `pending` candidate or update the mapped article for
a `published` candidate.

Do not retry a failed source blindly. Record the candidate ID and concise root
cause, leave a pending candidate unmapped or its current article unchanged, and
continue with other candidates.

### 3. Clean fixed placeholders only when requested

Dry run first and save the complete manifest:

```bash
node src/ingest/cli.js purge-placeholders \
  > "/tmp/coderx-placeholder-manifest-$(date +%Y%m%d-%H%M%S).json"
```

Inspect the matched IDs. Apply only after the dry-run manifest is complete:

```bash
pnpm ingest purge-placeholders --apply
```

The cleanup is valid only for Tiptap documents containing all four exact
markers: `摘要`, `为什么值得阅读`, `来源`, and linked text `阅读原文 ↗`.
Never delete by title, age, author, or a loose keyword query.

### 4. Check runtime assets before route code

The ingest command writes images relative to its backend working directory. The
local API may be running from another checkout.

When the database contains image rows but HTTP image requests fail:

1. Read the API listener PID and process working directory.
2. Check whether the exact original and `-small` files exist there.
3. Compare that directory with the ingest output directory.
4. If they differ, copy only the current batch's generated files after refusing
   to overwrite different existing files, or restart the local API from the
   ingest checkout.
5. Retest one original and one thumbnail before inspecting router code.

Do not infer a route-order or frontend-rendering bug until this check passes.

### 5. Verify once

```bash
PGPASSWORD='<local password>' \
CODERX_ARTICLE_IDS='143,146,150,151,152' \
  .cursor/skills/coderx-raw-content-ops/scripts/verify-local.sh
```

The check must confirm:

- every requested article exists and has structured content;
- assigned authors are existing users and are distinct for a five-item batch;
- dates are within the previous 30 days;
- each article has at least one database-linked image;
- every original and thumbnail URL returns HTTP 200;
- the placeholder dry run reports zero matches after cleanup.

During implementation changes, run focused ingest tests. Run the full backend
suite only once at the final gate. A data-only batch does not need repeated
frontend builds.

## Failure triage

| Symptom | First evidence to collect | Avoid |
|---|---|---|
| Source extraction fails | HTTP status, final canonical URL, readable character count | Switching to translation or inventing content |
| No usable image | Content type, decoded dimensions, local staged file count | Downloading random unrelated cover art |
| Article not created or unchanged | Candidate eligibility/mapping and transaction error | Direct ad-hoc SQL mutation |
| Image row exists but URL fails | API process cwd and exact physical filename | Guessing about router order |
| Slow model or model download | Stop the command and confirm `backfill-raw` | Waiting for Ollama |
| One candidate fails | Isolate it and finish the remaining reviewed IDs | Restarting the entire batch |

## Communication contract

Keep task updates compact:

1. Start: batch size, backend directory, local-only boundary.
2. Progress: one line only when the phase changes.
3. Blocker: candidate ID, failing boundary, and next safe action.
4. Finish: created/updated/deleted/failed counts, candidate and article IDs,
   image count, verification result, branch, and explicit statement that
   production was untouched.

Suppress normal per-image HTTP lines and successful per-test output. Show
detailed logs only for failures. Do not repeatedly narrate unchanged state.

## Completion boundary

Finish with local database rows, local assets, API/UI verification, a saved
cleanup manifest when deletion occurred, and a clean feature branch. Stop
before remote synchronization, PM2 enablement, deployment, or production
database changes unless the user explicitly expands the scope.
