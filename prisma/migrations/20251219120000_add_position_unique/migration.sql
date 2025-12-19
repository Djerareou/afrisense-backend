-- Add unique constraint to prevent duplicate positions per tracker and timestamp
-- Note: Ensure there are no existing duplicates before applying (or resolve them first).

CREATE UNIQUE INDEX IF NOT EXISTS "Position_trackerId_timestamp_unique" ON "Position"("trackerId", "timestamp");
