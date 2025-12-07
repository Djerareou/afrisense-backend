/*
  Warnings:

  - Added the required column `protocol` to the `Tracker` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
-- Use IF NOT EXISTS so migration is idempotent when re-run against shadow DBs
ALTER TABLE "Tracker"
    ADD COLUMN IF NOT EXISTS "apn" TEXT,
    ADD COLUMN IF NOT EXISTS "iccid" TEXT,
    ADD COLUMN IF NOT EXISTS "ipServer" TEXT,
    -- isDeleted: add with default false if not exists
    ADD COLUMN IF NOT EXISTS "isDeleted" BOOLEAN DEFAULT false,
    ADD COLUMN IF NOT EXISTS "port" INTEGER,
    -- protocol: add as nullable first to avoid failing on non-empty tables
    ADD COLUMN IF NOT EXISTS "protocol" TEXT,
    ALTER COLUMN "simNumber" DROP NOT NULL;

-- Ensure existing rows have a protocol value to allow setting NOT NULL safely.
-- Set a sensible default for existing rows if protocol is NULL. Adjust value as needed.
UPDATE "Tracker" SET "protocol" = 'custom' WHERE "protocol" IS NULL;
-- Finally enforce NOT NULL for protocol
ALTER TABLE "Tracker" ALTER COLUMN "protocol" SET NOT NULL;

-- CreateTable
CREATE TABLE "Vehicle" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "brand" TEXT,
    "model" TEXT,
    "plate" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Vehicle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TrackerAssignment" (
    "id" TEXT NOT NULL,
    "trackerId" TEXT NOT NULL,
    "vehicleId" TEXT NOT NULL,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "removedAt" TIMESTAMP(3),

    CONSTRAINT "TrackerAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TrackerConfigLog" (
    "id" TEXT NOT NULL,
    "trackerId" TEXT NOT NULL,
    "command" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "response" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TrackerConfigLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Vehicle_plate_key" ON "Vehicle"("plate");

-- AddForeignKey
ALTER TABLE "Vehicle" ADD CONSTRAINT "Vehicle_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrackerAssignment" ADD CONSTRAINT "TrackerAssignment_trackerId_fkey" FOREIGN KEY ("trackerId") REFERENCES "Tracker"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrackerAssignment" ADD CONSTRAINT "TrackerAssignment_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrackerConfigLog" ADD CONSTRAINT "TrackerConfigLog_trackerId_fkey" FOREIGN KEY ("trackerId") REFERENCES "Tracker"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
