-- Migration: make protocol nullable, backfill existing rows, then make NOT NULL
-- Step 1: add nullable column (safe)
ALTER TABLE "Tracker" ADD COLUMN IF NOT EXISTS "protocol" varchar;

-- Step 2 (run separately): backfill rows that have NULL protocol
-- UPDATE "Tracker" SET "protocol" = 'GT06' WHERE "protocol" IS NULL;

-- Step 3 (run after backfill): make column NOT NULL
-- ALTER TABLE "Tracker" ALTER COLUMN "protocol" SET NOT NULL;

-- Notes:
-- 1) Run these statements in the test/prod DB only after reviewing and
--    choosing the correct default protocol for your fleet. 'GT06' is a
--    conservative default used by the app but adapt as needed.
-- 2) I recommend doing Step 1 and Step 2 in a single deploy/maintenance
--    window, verify, then run Step 3 in a follow-up migration.
