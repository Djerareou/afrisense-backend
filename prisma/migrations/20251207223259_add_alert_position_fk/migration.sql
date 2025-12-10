-- AddForeignKey
ALTER TABLE "Alert" ADD CONSTRAINT "Alert_positionId_fkey" FOREIGN KEY ("positionId") REFERENCES "Position"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
