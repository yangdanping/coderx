#!/usr/bin/env bash
set -euo pipefail

usage() {
  printf '%s\n' \
    'Usage: preflight.sh [--resolve-backend]' \
    '' \
    'Read-only CoderX ingest checks.' \
    'Optional environment: CODERX_PROJECT_ROOT, CODERX_BACKEND_DIR,' \
    'CODERX_API_ORIGIN, CODERX_API_PORT, and standard PostgreSQL PG variables.'
}

fail() {
  printf 'preflight=failed reason=%s\n' "$1" >&2
  exit 1
}

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd -P)"
default_project_root="$(cd "$script_dir/../../../.." && pwd -P)"
project_root="${CODERX_PROJECT_ROOT:-$default_project_root}"

has_raw_command() {
  local directory="$1"
  [[ -f "$directory/src/ingest/cli.js" ]] &&
    grep -q 'backfill-raw' "$directory/src/ingest/cli.js"
}

resolve_backend() {
  local sibling_root
  local worktree_root

  if [[ -n "${CODERX_BACKEND_DIR:-}" ]]; then
    has_raw_command "$CODERX_BACKEND_DIR" ||
      fail "CODERX_BACKEND_DIR does not expose backfill-raw: $CODERX_BACKEND_DIR"
    cd "$CODERX_BACKEND_DIR"
    pwd -P
    return
  fi

  sibling_root="$(cd "$project_root/.." && pwd -P)/coderx_server"
  worktree_root="$sibling_root/.worktrees/ai-content-ingest"

  if has_raw_command "$sibling_root"; then
    cd "$sibling_root"
    pwd -P
  elif has_raw_command "$worktree_root"; then
    cd "$worktree_root"
    pwd -P
  else
    fail "no sibling backend checkout exposes backfill-raw"
  fi
}

case "${1:-}" in
  --help|-h)
    usage
    exit 0
    ;;
  --resolve-backend)
    resolve_backend
    exit 0
    ;;
  '')
    ;;
  *)
    fail "unknown option: $1"
    ;;
esac

for command_name in git node pnpm psql curl; do
  command -v "$command_name" >/dev/null 2>&1 ||
    fail "missing required command: $command_name"
done

backend_dir="$(resolve_backend)"
api_origin="${CODERX_API_ORIGIN:-http://127.0.0.1:8000}"
api_port="${CODERX_API_PORT:-8000}"

export PGHOST="${PGHOST:-127.0.0.1}"
export PGPORT="${PGPORT:-5432}"
export PGDATABASE="${PGDATABASE:-coderx}"
export PGUSER="${PGUSER:-postgres}"

psql -X -q -Atc 'SELECT 1' >/dev/null 2>&1 ||
  fail "cannot connect to PostgreSQL at $PGHOST:$PGPORT/$PGDATABASE"

branch="$(git -C "$backend_dir" branch --show-current)"
candidate_count="$(
  psql -X -q -Atc 'SELECT count(*) FROM ingest_candidate' 2>/dev/null
)" || fail 'ingest_candidate table is unavailable'

api_pid=''
api_cwd=''
runtime_asset_mismatch='unknown'
if command -v lsof >/dev/null 2>&1; then
  api_pid="$(
    lsof -nP -iTCP:"$api_port" -sTCP:LISTEN 2>/dev/null |
      awk 'NR == 2 { print $2 }'
  )"
  if [[ -n "$api_pid" ]]; then
    api_cwd="$(
      lsof -a -p "$api_pid" -d cwd -Fn 2>/dev/null |
        awk 'substr($0, 1, 1) == "n" { print substr($0, 2); exit }'
    )"
    if [[ -n "$api_cwd" ]]; then
      if [[ "$api_cwd" == "$backend_dir" ]]; then
        runtime_asset_mismatch='no'
      else
        runtime_asset_mismatch='yes'
      fi
    fi
  fi
fi

api_state='not-listening'
if [[ -n "$api_pid" ]]; then
  api_state='listening'
fi

printf 'backend=%s\n' "$backend_dir"
printf 'branch=%s\n' "${branch:-detached}"
printf 'database=ok candidates=%s\n' "$candidate_count"
printf 'api=%s origin=%s pid=%s\n' "$api_state" "$api_origin" "${api_pid:-none}"
printf 'api_cwd=%s\n' "${api_cwd:-unknown}"
printf 'ingest_asset_dir=%s/public/img\n' "$backend_dir"
printf 'runtime_asset_mismatch=%s\n' "$runtime_asset_mismatch"
printf 'preflight=ok\n'
