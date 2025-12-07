-- Migration: 20251203_add_postgis
-- Purpose: enable PostGIS, add geography 'location' column to Position, backfill from latitude/longitude,
-- create GIST index and trigger to keep 'location' in sync.
--
-- IMPORTANT:
-- 1) Test on staging with a recent DB dump before applying to production.
-- 2) If the Position table is very large, prefer to backfill in controlled batches (see instructions file).
-- 3) Don't drop extension in rollback in case other tables use PostGIS.

BEGIN;

-- 1) Enable PostGIS extension (idempotent)
CREATE EXTENSION IF NOT EXISTS postgis;

-- 2) Add geometry column (Point) if it doesn't exist
ALTER TABLE "Position" ADD COLUMN IF NOT EXISTS location geometry(Point,4326);

-- 3) Backfill existing rows (single-statement). For very large tables, prefer the batch script provided in
--    prisma/postgis_migration_instructions.md. This query will update all rows that have lat/lon and null location.
--    On very large tables this may run long and create WAL pressure; use the batch script instead.
UPDATE "Position"
SET location = ST_SetSRID(ST_MakePoint(longitude::double precision, latitude::double precision), 4326)
WHERE location IS NULL AND latitude IS NOT NULL AND longitude IS NOT NULL;

-- 4) Create GIST index on location to accelerate bbox / spatial queries
CREATE INDEX IF NOT EXISTS idx_positions_location
ON "Position"
USING GIST (location);

-- 5) Create function + trigger to maintain location on INSERT/UPDATE
CREATE OR REPLACE FUNCTION positions_set_location()
RETURNS trigger AS $$
BEGIN
  IF (NEW.longitude IS NOT NULL AND NEW.latitude IS NOT NULL) THEN
    NEW.location := ST_SetSRID(ST_MakePoint(NEW.longitude::double precision, NEW.latitude::double precision), 4326);
  ELSE
    NEW.location := NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_positions_set_location ON "Position";
CREATE TRIGGER trg_positions_set_location
BEFORE INSERT OR UPDATE ON "Position"
FOR EACH ROW EXECUTE PROCEDURE positions_set_location();

COMMIT;

-- DOWN / rollback guidance (manual steps):
-- 1) DROP TRIGGER trg_positions_set_location ON "Position";
-- 2) DROP FUNCTION positions_set_location();
-- 3) DROP INDEX positions_location_idx;
-- 4) ALTER TABLE "Position" DROP COLUMN location;   -- CAUTION: this will remove spatial data
-- Note: do NOT DROP EXTENSION postgis if other tables use it. Drop extension only if you are certain.
