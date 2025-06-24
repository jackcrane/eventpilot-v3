/*
  Warnings:

  - A unique constraint covering the columns `[shiftId,formResponseId]` on the table `FormResponseShift` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "FormResponseShift_shiftId_formResponseId_key" ON "FormResponseShift"("shiftId", "formResponseId");
