#!/usr/bin/env bash
set -euo pipefail

skill_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd -P)"
preflight="$skill_dir/scripts/preflight.sh"
verify_local="$skill_dir/scripts/verify-local.sh"

fail() {
  printf 'FAIL: %s\n' "$1" >&2
  exit 1
}

[[ -x "$preflight" ]] || fail 'preflight.sh must exist and be executable'
[[ -x "$verify_local" ]] || fail 'verify-local.sh must exist and be executable'

"$preflight" --help >/dev/null
"$verify_local" --help >/dev/null

if grep -Eq 'PGPASSWORD=' "$preflight" "$verify_local"; then
  fail 'scripts must not contain a literal database password assignment'
fi

if grep -Eiq '\bpsql\b.*\b(delete|insert|update|truncate|drop|alter)\b|purge-placeholders[[:space:]]+--apply|\b(rm|mv|cp)[[:space:]]' "$preflight" "$verify_local"; then
  fail 'diagnostic scripts must remain read-only'
fi

fixture_root="$(mktemp -d "${TMPDIR:-/tmp}/coderx-skill-test.XXXXXX")"
trap 'rm -rf "$fixture_root"' EXIT

project_root="$fixture_root/coderx"
main_backend="$fixture_root/coderx_server"
worktree_backend="$main_backend/.worktrees/ai-content-ingest"
mkdir -p "$project_root" "$main_backend/src/ingest" "$worktree_backend/src/ingest"
printf "const KNOWN_COMMANDS = new Set(['collect']);\n" > "$main_backend/src/ingest/cli.js"
printf "const KNOWN_COMMANDS = new Set(['backfill-raw']);\n" > "$worktree_backend/src/ingest/cli.js"

resolved="$(
  CODERX_PROJECT_ROOT="$project_root" \
    "$preflight" --resolve-backend
)"
expected_backend="$(cd "$worktree_backend" && pwd -P)"

[[ "$resolved" == "$expected_backend" ]] || fail 'backend discovery must prefer a checkout exposing backfill-raw'

printf 'PASS: script contracts\n'
