-- Speed up the date-range filters used by the administration reports.
CREATE INDEX "FaqLog_school_timestamp_idx" ON "FaqLog"("school", "timestamp");
CREATE INDEX "DiagnosisSessionLog_schoolId_createdAt_idx" ON "DiagnosisSessionLog"("schoolId", "createdAt");
