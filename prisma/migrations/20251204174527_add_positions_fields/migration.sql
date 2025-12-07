/*
  Warnings:

  - The `coordinates` column on the `Geofence` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `center` column on the `Geofence` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - You are about to drop the column `createdAt` on the `GeofenceEvent` table. All the data in the column will be lost.
  - You are about to drop the column `eventType` on the `GeofenceEvent` table. All the data in the column will be lost.
  - Added the required column `type` to the `GeofenceEvent` table without a default value. This is not possible if the table is not empty.
  - Made the column `positionId` on table `GeofenceEvent` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE "GeofenceEvent" DROP CONSTRAINT "GeofenceEvent_positionId_fkey";

-- DropIndex
DROP INDEX "GeofenceEvent_geofenceId_timestamp_idx";

-- DropIndex
DROP INDEX "GeofenceEvent_trackerId_timestamp_idx";

-- AlterTable
ALTER TABLE "Geofence" DROP COLUMN "coordinates",
ADD COLUMN     "coordinates" JSONB,
DROP COLUMN "center",
ADD COLUMN     "center" JSONB;

-- AlterTable
ALTER TABLE "GeofenceEvent" DROP COLUMN "createdAt",
DROP COLUMN "eventType",
ADD COLUMN     "type" TEXT NOT NULL,
ALTER COLUMN "positionId" SET NOT NULL;

-- AddForeignKey
ALTER TABLE "GeofenceEvent" ADD CONSTRAINT "GeofenceEvent_positionId_fkey" FOREIGN KEY ("positionId") REFERENCES "Position"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
