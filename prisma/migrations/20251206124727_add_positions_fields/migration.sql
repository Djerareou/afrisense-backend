/*
  Warnings:

  - You are about to drop the column `timestamp` on the `Alert` table. All the data in the column will be lost.
  - Added the required column `message` to the `Alert` table without a default value. This is not possible if the table is not empty.
  - Changed the type of `type` on the `Alert` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `severity` on the `Alert` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- CreateEnum
CREATE TYPE "AlertType" AS ENUM ('GEOFENCE_ENTER', 'GEOFENCE_EXIT', 'BATTERY_LOW', 'OFFLINE', 'SOS', 'OVERSPEED', 'VIBRATION', 'CUSTOM');

-- CreateEnum
CREATE TYPE "AlertSeverity" AS ENUM ('INFO', 'WARNING', 'CRITICAL');

-- CreateEnum
CREATE TYPE "NotificationChannel" AS ENUM ('CONSOLE', 'EMAIL', 'SMS', 'PUSH', 'WEBHOOK');

-- DropForeignKey
ALTER TABLE "Alert" DROP CONSTRAINT "Alert_trackerId_fkey";

-- DropForeignKey
ALTER TABLE "Alert" DROP CONSTRAINT "Alert_userId_fkey";

-- AlterTable
ALTER TABLE "Alert" DROP COLUMN "timestamp",
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "deliveredAt" TIMESTAMP(3),
ADD COLUMN     "message" TEXT NOT NULL,
ADD COLUMN     "metadata" JSONB,
ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'new',
ADD COLUMN     "title" TEXT,
ALTER COLUMN "trackerId" DROP NOT NULL,
ALTER COLUMN "userId" DROP NOT NULL,
DROP COLUMN "type",
ADD COLUMN     "type" "AlertType" NOT NULL,
DROP COLUMN "severity",
ADD COLUMN     "severity" "AlertSeverity" NOT NULL;

-- AlterTable
ALTER TABLE "GeofenceEvent" ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "meta" JSONB;

-- CreateTable
CREATE TABLE "AlertSetting" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "channels" JSONB NOT NULL,
    "thresholds" JSONB,
    "timezone" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AlertSetting_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AlertDeliveryLog" (
    "id" TEXT NOT NULL,
    "alertId" TEXT NOT NULL,
    "channel" "NotificationChannel" NOT NULL,
    "status" TEXT NOT NULL,
    "providerRef" TEXT,
    "error" TEXT,
    "attemptedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedAt" TIMESTAMP(3),

    CONSTRAINT "AlertDeliveryLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AlertSetting_userId_key" ON "AlertSetting"("userId");

-- CreateIndex
CREATE INDEX "AlertDeliveryLog_alertId_idx" ON "AlertDeliveryLog"("alertId");

-- CreateIndex
CREATE INDEX "AlertDeliveryLog_channel_status_idx" ON "AlertDeliveryLog"("channel", "status");

-- CreateIndex
CREATE INDEX "Alert_userId_createdAt_idx" ON "Alert"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "Alert_trackerId_createdAt_idx" ON "Alert"("trackerId", "createdAt");

-- CreateIndex
CREATE INDEX "Alert_type_createdAt_idx" ON "Alert"("type", "createdAt");

-- CreateIndex
CREATE INDEX "GeofenceEvent_trackerId_timestamp_idx" ON "GeofenceEvent"("trackerId", "timestamp");

-- CreateIndex
CREATE INDEX "GeofenceEvent_geofenceId_timestamp_idx" ON "GeofenceEvent"("geofenceId", "timestamp");

-- AddForeignKey
ALTER TABLE "Alert" ADD CONSTRAINT "Alert_trackerId_fkey" FOREIGN KEY ("trackerId") REFERENCES "Tracker"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Alert" ADD CONSTRAINT "Alert_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AlertSetting" ADD CONSTRAINT "AlertSetting_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AlertDeliveryLog" ADD CONSTRAINT "AlertDeliveryLog_alertId_fkey" FOREIGN KEY ("alertId") REFERENCES "Alert"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
