-- CreateTable
CREATE TABLE "FormResponseShift" (
    "id" TEXT NOT NULL,
    "formResponseId" TEXT NOT NULL,
    "shiftId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FormResponseShift_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "FormResponseShift" ADD CONSTRAINT "FormResponseShift_formResponseId_fkey" FOREIGN KEY ("formResponseId") REFERENCES "FormResponse"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FormResponseShift" ADD CONSTRAINT "FormResponseShift_shiftId_fkey" FOREIGN KEY ("shiftId") REFERENCES "Shift"("id") ON DELETE CASCADE ON UPDATE CASCADE;
