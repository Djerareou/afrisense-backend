/*
  Warnings:

  - A unique constraint covering the columns `[externalId]` on the table `Position` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `updatedAt` to the `Geofence` table without a default value. This is not possible if the table is not empty.
  - Made the column `isDeleted` on table `Tracker` required. This step will fail if there are existing NULL values in that column.

*/
-- DropIndex
DROP INDEX "idx_positions_location";

-- AlterTable
ALTER TABLE "Geofence" ADD COLUMN     "active" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "center" TEXT,
ADD COLUMN     "color" TEXT,
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "description" TEXT,
ADD COLUMN     "radius" DOUBLE PRECISION,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL,
ALTER COLUMN "coordinates" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Position" ADD COLUMN     "accuracy" DOUBLE PRECISION,
ADD COLUMN     "altitude" DOUBLE PRECISION,
ADD COLUMN     "batteryLevel" DOUBLE PRECISION,
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "externalId" TEXT,
ADD COLUMN     "odometer" DOUBLE PRECISION,
ADD COLUMN     "source" TEXT,
ALTER COLUMN "eventType" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Tracker" ADD COLUMN     "label" TEXT,
ALTER COLUMN "protocol" SET DATA TYPE TEXT,
ALTER COLUMN "isDeleted" SET NOT NULL;

-- CreateTable
CREATE TABLE "GeofenceEvent" (
    "id" TEXT NOT NULL,
    "trackerId" TEXT NOT NULL,
    "geofenceId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "positionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GeofenceEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_TrackerGeofences" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_TrackerGeofences_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "GeofenceEvent_trackerId_timestamp_idx" ON "GeofenceEvent"("trackerId", "timestamp");

-- CreateIndex
CREATE INDEX "GeofenceEvent_geofenceId_timestamp_idx" ON "GeofenceEvent"("geofenceId", "timestamp");

-- CreateIndex
CREATE INDEX "_TrackerGeofences_B_index" ON "_TrackerGeofences"("B");

-- CreateIndex
CREATE UNIQUE INDEX "Position_externalId_key" ON "Position"("externalId");

-- CreateIndex
CREATE INDEX "Position_trackerId_timestamp_idx" ON "Position"("trackerId", "timestamp");

-- AddForeignKey
ALTER TABLE "GeofenceEvent" ADD CONSTRAINT "GeofenceEvent_trackerId_fkey" FOREIGN KEY ("trackerId") REFERENCES "Tracker"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GeofenceEvent" ADD CONSTRAINT "GeofenceEvent_geofenceId_fkey" FOREIGN KEY ("geofenceId") REFERENCES "Geofence"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GeofenceEvent" ADD CONSTRAINT "GeofenceEvent_positionId_fkey" FOREIGN KEY ("positionId") REFERENCES "Position"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_TrackerGeofences" ADD CONSTRAINT "_TrackerGeofences_A_fkey" FOREIGN KEY ("A") REFERENCES "Geofence"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_TrackerGeofences" ADD CONSTRAINT "_TrackerGeofences_B_fkey" FOREIGN KEY ("B") REFERENCES "Tracker"("id") ON DELETE CASCADE ON UPDATE CASCADE;
