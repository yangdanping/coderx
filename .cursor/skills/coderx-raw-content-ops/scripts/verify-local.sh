#!/usr/bin/env bash
set -euo pipefail

usage() {
  printf '%s\n' \
    'Usage: verify-local.sh [--ids 143,146,150]' \
    '' \
    'Read-only verification for locally ingested CoderX articles.' \
    'IDs may also be supplied through CODERX_ARTICLE_IDS.' \
    'Optional environment: CODERX_API_ORIGIN, CODERX_BACKEND_DIR,' \
    'CODERX_PROJECT_ROOT, and standard PostgreSQL PG variables.'
}

fail() {
  printf 'verification=failed reason=%s\n' "$1" >&2
  exit 1
}

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd -P)"
preflight="$script_dir/preflight.sh"
article_ids="${CODERX_ARTICLE_IDS:-}"

case "${1:-}" in
  --help|-h)
    usage
    exit 0
    ;;
  --ids)
    [[ -n "${2:-}" ]] || fail '--ids requires a comma-separated value'
    article_ids="$2"
    shift 2
    ;;
  '')
    ;;
  *)
    fail "unknown option: $1"
    ;;
esac

[[ $# -eq 0 ]] || fail "unknown option: $1"
[[ "$article_ids" =~ ^[1-9][0-9]*(,[1-9][0-9]*){0,4}$ ]] ||
  fail 'article IDs must contain 1–5 unique positive integers'

IFS=',' read -r -a requested_ids <<< "$article_ids"
seen_ids=','
for article_id in "${requested_ids[@]}"; do
  [[ "$seen_ids" != *",$article_id,"* ]] ||
    fail 'article IDs must not contain duplicates'
  seen_ids="${seen_ids}${article_id},"
done

for command_name in node psql curl; do
  command -v "$command_name" >/dev/null 2>&1 ||
    fail "missing required command: $command_name"
done

backend_dir="$("$preflight" --resolve-backend)"
api_origin="${CODERX_API_ORIGIN:-http://127.0.0.1:8000}"

export PGHOST="${PGHOST:-127.0.0.1}"
export PGPORT="${PGPORT:-5432}"
export PGDATABASE="${PGDATABASE:-coderx}"
export PGUSER="${PGUSER:-postgres}"

summary_sql="
SELECT
  count(DISTINCT a.id),
  count(DISTINCT a.user_id),
  count(DISTINCT a.id) FILTER (
    WHERE jsonb_typeof(a.content) = 'object'
  ),
  count(DISTINCT a.id) FILTER (
    WHERE a.create_at >= now() - interval '30 days'
      AND a.create_at <= now()
  ),
  count(f.id) FILTER (WHERE f.file_type = 'image'),
  count(DISTINCT a.id) FILTER (
    WHERE f.id IS NOT NULL AND f.file_type = 'image'
  )
FROM article a
LEFT JOIN file f ON f.article_id = a.id
WHERE a.id = ANY(ARRAY[$article_ids]::bigint[]);
"

summary="$(
  psql -X -q -At -F '|' -c "$summary_sql" 2>/dev/null
)" || fail "cannot query PostgreSQL at $PGHOST:$PGPORT/$PGDATABASE"

IFS='|' read -r article_count author_count structured_count recent_count image_count image_article_count <<< "$summary"
expected_count="${#requested_ids[@]}"

[[ "$article_count" == "$expected_count" ]] ||
  fail "expected $expected_count articles but found $article_count"
[[ "$author_count" == "$expected_count" ]] ||
  fail "expected $expected_count distinct existing authors but found $author_count"
[[ "$structured_count" == "$expected_count" ]] ||
  fail "only $structured_count/$expected_count articles have structured content"
[[ "$recent_count" == "$expected_count" ]] ||
  fail "only $recent_count/$expected_count articles are dated within 30 days"
[[ "$image_article_count" == "$expected_count" ]] ||
  fail "only $image_article_count/$expected_count articles have linked images"

for article_id in "${requested_ids[@]}"; do
  http_code="$(
    curl -sS -o /dev/null -w '%{http_code}' "$api_origin/article/$article_id"
  )" || fail "article API request failed for $article_id"
  [[ "$http_code" == '200' ]] ||
    fail "article $article_id returned HTTP $http_code"
done

filenames="$(
  psql -X -q -Atc "
    SELECT filename
    FROM file
    WHERE article_id = ANY(ARRAY[$article_ids]::bigint[])
      AND file_type = 'image'
    ORDER BY article_id, id;
  " 2>/dev/null
)" || fail 'cannot query article image filenames'

checked_image_urls=0
while IFS= read -r filename; do
  [[ -n "$filename" ]] || continue
  for suffix in '' '?type=small'; do
    http_code="$(
      curl -sS -o /dev/null -w '%{http_code}' \
        "$api_origin/article/images/$filename$suffix"
    )" || fail "image request failed for $filename$suffix"
    [[ "$http_code" == '200' ]] ||
      fail "image $filename$suffix returned HTTP $http_code"
    checked_image_urls=$((checked_image_urls + 1))
  done
done <<< "$filenames"

placeholder_output="$(
  cd "$backend_dir"
  NODE_ENV=development node ./src/ingest/cli.js purge-placeholders
)" || fail 'placeholder dry run failed'

placeholder_count="$(
  printf '%s' "$placeholder_output" |
    node -e '
      let input = "";
      process.stdin.on("data", (chunk) => (input += chunk));
      process.stdin.on("end", () => {
        const start = input.indexOf("{");
        if (start < 0) process.exit(1);
        const result = JSON.parse(input.slice(start));
        process.stdout.write(String(result.matched));
      });
    '
)" || fail 'placeholder dry run returned invalid JSON'

[[ "$placeholder_count" == '0' ]] ||
  fail "$placeholder_count fixed-format placeholder articles remain"

printf 'articles=%s authors=%s structured=%s recent=%s\n' \
  "$article_count" "$author_count" "$structured_count" "$recent_count"
printf 'images=%s checked_image_urls=%s\n' "$image_count" "$checked_image_urls"
printf 'placeholders=%s\n' "$placeholder_count"
printf 'verification=ok\n'
