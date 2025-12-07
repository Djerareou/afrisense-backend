PostGIS migration — instructions and safe backfill

Goal
----
Add PostGIS support and a geometry 'location' column to the existing `Position` table, backfill from `latitude`/`longitude`, and create a GIST index for fast bbox/spatial queries.

Summary of steps provided
-------------------------
1. Review & backup: take a DB dump before doing any schema change.
2. Apply migration SQL (prisma/migrations/20251203_add_postgis/migration.sql) on a staging DB first.
3. If the `Position` table is large, use the provided batch backfill script to fill `location` in chunks.
4. Verify results, then run the migration on production during a maintenance window if necessary.

Why batching?
--------------
A single large UPDATE can create a lot of WAL and lock activity. Batching (e.g. 10k rows at a time) reduces WAL spikes and allows you to monitor progress.

Safe batch backfill (recommended for big tables)
------------------------------------------------
Use this PL/pgSQL anonymous block on the DB. It updates in batches of 10k rows until none remain.

DO $$
DECLARE
  rows_updated integer := 1;
BEGIN
  WHILE rows_updated > 0 LOOP
    WITH cte AS (
      SELECT id FROM "Position"
      WHERE (location IS NULL) AND (latitude IS NOT NULL AND longitude IS NOT NULL)
      LIMIT 10000
    )
  UPDATE "Position" p
  SET location = ST_SetSRID(ST_MakePoint(p.longitude::double precision, p.latitude::double precision), 4326)
    FROM cte
    WHERE p.id = cte.id
    RETURNING 1 INTO rows_updated;

    -- get rows count for this batch (optional: log or monitor externally)
    GET DIAGNOSTICS rows_updated = ROW_COUNT;

    RAISE NOTICE 'Batch updated: % rows', rows_updated;
    -- small pause if desired (uncomment)
    -- PERFORM pg_sleep(0.5);
  END LOOP;
END$$;

Notes:
- The above uses a LIMIT/CTE approach. Tune LIMIT (e.g. 10000, 50000) based on your hardware.
- Monitor WAL and disk space while backfilling.

Keeping location in sync on future writes
----------------------------------------
The migration adds a trigger `trg_positions_set_location` which calls `positions_set_location()` to compute the geography location from latitude/longitude whenever a row is inserted or updated.

Alternative: use generated column (Postgres 12+ supports generated columns), but geography types with generated columns may be less flexible. Trigger approach is portable and reversible.

Indexing strategy
-----------------
 - We create a GIST index on `location`:
  CREATE INDEX idx_positions_location ON "Position" USING GIST (location);
- Consider also creating a composite index for queries by tracker/time if you frequently filter by tracker and bbox:
  CREATE INDEX positions_tracker_time_location_idx ON "Position" ("trackerId", timestamp) INCLUDE (location);
  (Note: test and tune; index types and column orders matter.)

Backups & rollback
------------------
- Always take a full backup (pg_dump or filesystem snapshot) before running on production.
- Rollback steps (manual):
  1) DROP TRIGGER trg_positions_set_location ON "Position";
  2) DROP FUNCTION positions_set_location();
  3) DROP INDEX positions_location_idx;
  4) ALTER TABLE "Position" DROP COLUMN location;
  5) (Optional) DROP EXTENSION postgis; -- only if no other table uses PostGIS

Applying via prisma
-------------------
- Prisma migrations are SQL files inside `prisma/migrations/*/migration.sql`. You may place the provided SQL inside a new migration folder (as created here).
- Alternatively, run the migration SQL directly with psql using a DB user with adequate privileges.

Commands examples
-----------------
# Test on staging (run the file)
psql "${DATABASE_URL}" -f prisma/migrations/20251203_add_postgis/migration.sql

# Run safe batch backfill (copy/paste block into psql session)
psql "${DATABASE_URL}" -c "DO $$ ... $$;" 

Caveats & validation
--------------------
- Validate that location is populated for a sample of rows:
  SELECT id, latitude, longitude, ST_AsText(location) FROM "Position" LIMIT 10;
- Test bbox queries to ensure the index is used:
  EXPLAIN ANALYZE SELECT * FROM "Position" WHERE location && ST_MakeEnvelope(xmin, ymin, xmax, ymax, 4326) LIMIT 100;

If you want, I can:
- generate a ready-to-run `psql` script that performs the migration and performs batch backfill with configurable chunk size;
- add a small Node script that runs the batch backfill and reports progress;
- add the `location` field as an `Unsupported("geography(Point,4326)")` entry in `prisma/schema.prisma` (so Prisma client still exposes the field as Unsupported). Let me know which you'd prefer.
