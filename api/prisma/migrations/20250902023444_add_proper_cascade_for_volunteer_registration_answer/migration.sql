-- DropForeignKey
ALTER TABLE "FieldResponse" DROP CONSTRAINT "FieldResponse_fieldId_fkey";

-- AddForeignKey
ALTER TABLE "FieldResponse" ADD CONSTRAINT "FieldResponse_fieldId_fkey" FOREIGN KEY ("fieldId") REFERENCES "FormField"("id") ON DELETE CASCADE ON UPDATE CASCADE;
