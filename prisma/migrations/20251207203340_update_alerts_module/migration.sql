/*
  Warnings:

  - You are about to drop the column `createdAt` on the `Alert` table. All the data in the column will be lost.
  - You are about to drop the column `deliveredAt` on the `Alert` table. All the data in the column will be lost.
  - You are about to drop the column `message` on the `Alert` table. All the data in the column will be lost.
  - You are about to drop the column `metadata` on the `Alert` table. All the data in the column will be lost.
  - You are about to drop the column `severity` on the `Alert` table. All the data in the column will be lost.
  - You are about to drop the column `status` on the `Alert` table. All the data in the column will be lost.
  - You are about to drop the column `title` on the `Alert` table. All the data in the column will be lost.
  - You are about to drop the column `userId` on the `Alert` table. All the data in the column will be lost.
  - Added the required column `positionId` to the `Alert` table without a default value. This is not possible if the table is not empty.
  - Made the column `trackerId` on table `Alert` required. This step will fail if there are existing NULL values in that column.
  - The values [BATTERY_LOW,OFFLINE,SOS,VIBRATION,CUSTOM] on the enum `AlertType` will be removed. If these variants are still used in the database, this will fail.

*/

-- DropForeignKey
ALTER TABLE "Alert" DROP CONSTRAINT "Alert_userId_fkey";

-- DropIndex
DROP INDEX "Alert_userId_createdAt_idx";

-- AlterEnum
BEGIN;
CREATE TYPE "AlertType_new" AS ENUM ('GEOFENCE_ENTER', 'GEOFENCE_EXIT', 'OVERSPEED', 'NO_MOVEMENT', 'LOW_BATTERY', 'SIGNAL_LOSS', 'SUSPICIOUS_STOP', 'HIGH_TEMPERATURE', 'DEVICE_OFFLINE');
ALTER TABLE "Alert" ALTER COLUMN "type" TYPE "AlertType_new" USING ("type"::text::"AlertType_new");
ALTER TYPE "AlertType" RENAME TO "AlertType_old";
ALTER TYPE "AlertType_new" RENAME TO "AlertType";
DROP TYPE "AlertType_old";
COMMIT;

-- DropEnum
DROP TYPE "AlertSeverity";

-- AlterTable
ALTER TABLE "Alert" DROP COLUMN "createdAt",
DROP COLUMN "deliveredAt",
DROP COLUMN "message",
DROP COLUMN "metadata",
DROP COLUMN "severity",
DROP COLUMN "status",
DROP COLUMN "title",
DROP COLUMN "userId",
ADD COLUMN     "geofenceId" TEXT,
ADD COLUMN     "meta" JSONB,
ADD COLUMN     "positionId" TEXT NOT NULL,
ADD COLUMN     "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ALTER COLUMN "trackerId" SET NOT NULL;

-- DropIndex
DROP INDEX "Alert_trackerId_createdAt_idx";

-- DropIndex
DROP INDEX "Alert_type_createdAt_idx";

-- CreateIndex
CREATE INDEX "Alert_trackerId_timestamp_idx" ON "Alert"("trackerId", "timestamp");

-- CreateIndex
CREATE INDEX "Alert_type_timestamp_idx" ON "Alert"("type", "timestamp");

-- CreateIndex
CREATE INDEX "Alert_geofenceId_timestamp_idx" ON "Alert"("geofenceId", "timestamp");

-- AddForeignKey
ALTER TABLE "Alert" ADD CONSTRAINT "Alert_geofenceId_fkey" FOREIGN KEY ("geofenceId") REFERENCES "Geofence"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Alert" ADD CONSTRAINT "Alert_trackerId_fkey" FOREIGN KEY ("trackerId") REFERENCES "Tracker"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
