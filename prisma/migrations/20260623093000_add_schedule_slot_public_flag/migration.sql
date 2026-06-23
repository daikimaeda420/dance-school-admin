ALTER TABLE "DiagnosisScheduleSlot"
ADD COLUMN "isPublic" BOOLEAN NOT NULL DEFAULT true;

UPDATE "DiagnosisScheduleSlot"
SET "isPublic" = "isActive";

CREATE INDEX "DiagnosisScheduleSlot_schoolId_weekday_isActive_isPublic_idx"
ON "DiagnosisScheduleSlot"("schoolId", "weekday", "isActive", "isPublic");
