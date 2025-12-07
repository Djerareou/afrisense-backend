#!/usr/bin/env bash
set -euo pipefail

# Safe runner for PostGIS migration and backfill
# Usage:
#   ./scripts/run_postgis_migration.sh [--yes] [--chunk-size N] [--no-backup] [--no-batch]
# Defaults:
#   --chunk-size 10000
#   backup enabled
#   batch backfill enabled (recommended)

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="${SCRIPT_DIR}/.."
MIGRATION_SQL_PATH="${REPO_ROOT}/prisma/migrations/20251203_add_postgis/migration.sql"
CHUNK_SIZE=10000
NONINTERACTIVE=0
DO_BACKUP=1
USE_BATCH=1

usage() {
  cat <<EOF
Usage: $0 [options]
Options:
  --yes           run non-interactive (assume yes)
  --chunk-size N  chunk size for batch backfill (default: ${CHUNK_SIZE})
  --no-backup     skip pg_dump backup
  --no-batch      do not run batch backfill (will let migration.sql single UPDATE run)
  -h, --help      show this message

Example:
  DATABASE_URL="postgresql://postgres:postgres@localhost:5432/afrisense_db" \
    $0 --chunk-size 20000
EOF
}

while [[ ${#} -gt 0 ]]; do
  case "$1" in
    --yes)
      NONINTERACTIVE=1; shift;;
    --chunk-size)
      CHUNK_SIZE="$2"; shift 2;;
    --no-backup)
      DO_BACKUP=0; shift;;
    --no-batch)
      USE_BATCH=0; shift;;
    -h|--help)
      usage; exit 0;;
    *)
      echo "Unknown arg: $1"; usage; exit 1;;
  esac
done

# Helpers
fail() { echo "ERROR: $*" >&2; exit 1; }
info() { echo "[INFO] $*"; }

command -v psql >/dev/null 2>&1 || fail "psql not found in PATH"
command -v pg_dump >/dev/null 2>&1 || fail "pg_dump not found in PATH"

# Ensure DATABASE_URL
if [[ -z "${DATABASE_URL-}" ]]; then
  # try to source .env if present
  if [[ -f "${REPO_ROOT}/.env" ]]; then
    info "DATABASE_URL not set, sourcing ${REPO_ROOT}/.env"
    # shellcheck disable=SC1090
    set -a; source "${REPO_ROOT}/.env"; set +a
  fi
fi

if [[ -z "${DATABASE_URL-}" ]]; then
  fail "DATABASE_URL is not set. Export it, or add it to .env in project root."
fi

info "Using DATABASE_URL: ${DATABASE_URL}"

# Extract DB name for confirmation (best-effort)
DB_NAME=$(echo "${DATABASE_URL}" | sed -E 's/.*\/([^?@]+)(\?.*)?$/\1/') || DB_NAME="(unknown)"

if [[ ${NONINTERACTIVE} -eq 0 ]]; then
  echo "About to run PostGIS migration on database: ${DB_NAME}"
  read -rp "Proceed? [y/N] " yn
  case "$yn" in
    [Yy]*) ;;
    *) echo "Aborted by user"; exit 1;;
  esac
else
  info "Non-interactive: continuing without prompt"
fi

TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="${REPO_ROOT}/backup_before_postgis_${TIMESTAMP}.dump"

if [[ ${DO_BACKUP} -eq 1 ]]; then
  info "Creating backup to ${BACKUP_FILE} ..."
  pg_dump -Fc "$DATABASE_URL" -f "$BACKUP_FILE" || fail "pg_dump failed"
  info "Backup complete"
else
  info "Skipping backup as requested"
fi

# Check migration SQL exists
if [[ ! -f "$MIGRATION_SQL_PATH" ]]; then
  fail "Migration SQL not found: $MIGRATION_SQL_PATH"
fi

info "Applying migration SQL: $MIGRATION_SQL_PATH"
psql "$DATABASE_URL" -f "$MIGRATION_SQL_PATH" || fail "Migration SQL failed"
info "Migration applied successfully"

# If user requested batch backfill, run batch PL/pgSQL
if [[ ${USE_BATCH} -eq 1 ]]; then
  info "Running safe batch backfill with chunk size ${CHUNK_SIZE}"
  psql "$DATABASE_URL" -v ON_ERROR_STOP=1 <<SQL || fail "Batch backfill failed"
DO \$\$
DECLARE
  rows_updated integer := 1;
BEGIN
  WHILE rows_updated > 0 LOOP
    WITH cte AS (
      SELECT id FROM "Position"
      WHERE (location IS NULL) AND (latitude IS NOT NULL AND longitude IS NOT NULL)
      LIMIT ${CHUNK_SIZE}
    )
    UPDATE "Position" p
    SET location = ST_SetSRID(ST_MakePoint(p.longitude::double precision, p.latitude::double precision), 4326)
    FROM cte
    WHERE p.id = cte.id
    RETURNING 1 INTO rows_updated;

    GET DIAGNOSTICS rows_updated = ROW_COUNT;
    RAISE NOTICE 'Batch updated: % rows', rows_updated;
    -- short pause to reduce IO spikes (comment/uncomment as needed)
    -- PERFORM pg_sleep(0.1);
  END LOOP;
END\$\$;
SQL
  info "Batch backfill finished"
else
  info "Skipping batch backfill as requested (migration.sql contains a single UPDATE for location)"
fi

info "Running ANALYZE on \"Position\" to update planner statistics"
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -c "ANALYZE \"Position\";" || warn="ANALYZE failed"

info "PostGIS migration + backfill complete. Please verify sample rows and EXPLAIN ANALYZE spatial queries to ensure index usage."

echo "Done"
exit 0
